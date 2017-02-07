import Timer = NodeJS.Timer;
const path = require("path");
const child_process = require("child_process");

const debug = require("debug")("mouselight:pipeline-api:scheduler-hub");

import {PipelineStages, IPipelineStage} from "../data-model/pipelineStage";
import {Projects, IProject} from "../data-model/project";
import {IRunnableTableModelRow} from "../data-model/runnableTableModel";
import {startTileStatusFileWorker} from "./tileStatusWorkerChildProcess";
import {startPipelineStageWorker} from "./pipelineMapSchedulerChildProcess";

export interface ISchedulerInterface {
    IsExitRequested: boolean;
    IsProcessingRequested: boolean;

    loadTileStatusForPlane(zIndex: number);
}

const kEmptyTileMap = {
    max_depth: 0,
    x_min: 0,
    x_max: 0,
    y_min: 0,
    y_max: 0,
    tiles: []
};

export class SchedulerHub {
    private static _instance: SchedulerHub = null;

    public static async Run(useChildProcessWorkers: boolean = false): Promise<SchedulerHub> {
        if (!this._instance) {
            this._instance = new SchedulerHub(useChildProcessWorkers);

            await this._instance.start();
        }

        return this._instance;
    }

    public static get Instance(): SchedulerHub {
        return this._instance;
    }

    private _useChildProcessWorkers: boolean;

    private _pipelineStageWorkers = new Map<string, ISchedulerInterface>();

    public async loadTileStatusForPlane(project_id: string, plane: number): Promise<any> {
        try {
            if (plane == null) {
                debug("plane not defined");
                return kEmptyTileMap;
            }

            const projectsManager = Projects.defaultManager();

            const project = await projectsManager.get(project_id);

            if (!project) {
                debug("project not defined");
                return kEmptyTileMap;
            }

            const pipelineStagesManager = new PipelineStages();

            const stages = await pipelineStagesManager.getForProject(project_id);

            if (stages.length === 0) {
                debug("no stages for project");
                return kEmptyTileMap;
            }

            const maxDepth = stages.reduce((current, stage) => Math.max(current, stage.depth), 0);

            const workers = stages.map(stage => this._pipelineStageWorkers.get(stage.id)).filter(worker => worker != null);

            if (workers.length === 0) {
                debug("project not running");
                return kEmptyTileMap;
            }

            const promises = workers.map(worker => {
                return worker.loadTileStatusForPlane(plane);
            });

            const tilesAllStages = await Promise.all(promises);

            const tileArray = tilesAllStages.reduce((source, next) => source.concat(next), []);

            if (tileArray.length === 0) {
                debug("no tiles across all stages");
                return kEmptyTileMap;
            }

            let tiles = {};

            let x_min = 1e7, x_max = 0, y_min = 1e7, y_max = 0;

            tileArray.map(tile => {
                x_min = Math.min(x_min, tile.lat_x);
                x_max = Math.max(x_max, tile.lat_x);
                y_min = Math.min(y_min, tile.lat_y);
                y_max = Math.max(y_max, tile.lat_y);

                let t = tiles[`${tile.lat_x}_${tile.lat_y}`];

                if (!t) {
                    t = {
                        x_index: tile.lat_x,
                        y_index: tile.lat_y,
                        stages: []
                    };

                    tiles[`${tile.lat_x}_${tile.lat_y}`] = t;
                }

                t.stages.push({
                    stage_id: tile.stage_id,
                    depth: tile.depth,
                    status: tile.this_stage_status
                });
            });

            let output = [];

            for (let prop in tiles) {
                if (tiles.hasOwnProperty(prop)) {
                    output.push(tiles[prop]);
                }
            }

            return {
                max_depth: maxDepth,
                x_min: project.sample_x_min >= 0 ? project.sample_x_min : x_min,
                x_max: project.sample_x_max >= 0 ? project.sample_x_min : x_max,
                y_min: project.sample_y_min >= 0 ? project.sample_y_min : x_min,
                y_max: project.sample_y_max >= 0 ? project.sample_y_min : x_max,
                tiles: output
            };
        } catch (err) {
            console.log(err);
            return {};
        }
    }

    private constructor(useChildProcessWorkers: boolean = false) {
        this._useChildProcessWorkers = useChildProcessWorkers;
    }

    private async start() {
        await this.manageAllWorkers();
    }

    private async manageAllWorkers() {
        try {
            const projectsManager = Projects.defaultManager();

            const projects: IProject[] = await projectsManager.getAll();

            const pipelineStagesManager = new PipelineStages();

            // Turn stage workers off for projects that have been turned off.
            const pausedProjects = projects.filter(item => (item.is_processing || 0) === 0);

            await Promise.all(pausedProjects.map(project => this.pauseStagesForProject(pipelineStagesManager, project)));

            // Turn stage workers on (but not necessarily processing) for projects that are active for stats.
            // Individual stage processing is maintained in the next step.
            const resumedProjects = projects.filter(item => item.is_processing === true);

            await Promise.all(resumedProjects.map(project => this.resumeStagesForProject(pipelineStagesManager, project)));

            // Refresh processing state for active workers.
            await this.manageStageProcessingFlag();
        } catch (err) {
            debug(`exception (manageAllWorkers): ${err}`);
        }

        setTimeout(() => this.manageAllWorkers(), 10 * 1000);
    }

    private async resumeStagesForProject(pipelineStagesManager: PipelineStages, project: IProject) {
        const stages = await pipelineStagesManager.getForProject(project.id);

        await this.addWorker(project, startTileStatusFileWorker, "/tileStatusWorkerChildProcess.js");

        await Promise.all(stages.map(stage => this.resumeStage(pipelineStagesManager, stage)));
    }

    private async resumeStage(pipelineStagesManager: PipelineStages, stage: IPipelineStage): Promise <boolean> {
        return this.addWorker(stage, startPipelineStageWorker, "/pipelineMapSchedulerChildProcess.js");
    }

    private async pauseStagesForProject(pipelineStagesManager: PipelineStages, project: IProject) {
        const stages = await pipelineStagesManager.getForProject(project.id);

        await this.removeWorker(project/*, this._tileStatusWorkers*/);

        await Promise.all(stages.map(stage => this.pauseStage(pipelineStagesManager, stage)));
    }

    private async pauseStage(pipelineStagesManager: PipelineStages, stage: IPipelineStage): Promise <boolean> {
        await pipelineStagesManager.setProcessingStatus(stage.id, false);

        return this.removeWorker(stage/*, this._pipelineStageWorkers*/);
    }

    private async manageStageProcessingFlag() {
        const pipelineStagesManager = new PipelineStages();

        const stages: IPipelineStage[] = await pipelineStagesManager.getAll();

        return stages.map(stage => {
            let worker = this._pipelineStageWorkers.get(stage.id);

            if (worker) {
                worker.IsProcessingRequested = stage.is_processing;
            }
        });
    }

    private async addWorker(item: IRunnableTableModelRow, inProcessFunction, childProcessModuleName): Promise<boolean> {
        let worker = this._pipelineStageWorkers.get(item.id);

        if (!worker) {
            debug(`add worker for ${item.id}`);

            worker = await this.startWorker(inProcessFunction, childProcessModuleName, [item.id]);
            worker.IsProcessingRequested = item.is_processing;

            if (worker) {
                this._pipelineStageWorkers.set(item.id, worker);
            }

            return true;
        }

        return false;
    }

    private removeWorker(item: IRunnableTableModelRow): boolean {
        const worker = this._pipelineStageWorkers.get(item.id);

        if (worker) {
            debug(`remove worker for ${item.id}`);

            worker.IsExitRequested = true;

            this._pipelineStageWorkers.delete(item.id);

            return true;
        }

        return false;
    }

    private startWorkerChildProcess(moduleName: string, args: string[]) {
        // Options
        //   silent - pumps stdio back through this parent process
        //   execArv - remove possible $DEBUG flag on parent process causing address in use conflict
        const worker_process = child_process.fork(path.join(__dirname, moduleName), args, {silent: true, execArgv: []});

        worker_process.stdout.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.stderr.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.on("close", code => console.log(`child process exited with code ${code}`));

        return worker_process;
    }

    private async startWorker(inProcessFunction, childProcessModule: string, args: Array < any > = []) {
        if (this._useChildProcessWorkers) {
            debug("starting worker using child processes");
            return new Promise((resolve) => {
                let worker_process = this.startWorkerChildProcess(childProcessModule, args);
                resolve(worker_process);
            });
        } else {
            debug("starting worker within parent process");
            return await inProcessFunction(...args);
        }
    }
}

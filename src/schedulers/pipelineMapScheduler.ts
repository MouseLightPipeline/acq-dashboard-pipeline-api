import {TaskDefinitions} from "../data-model/taskDefinition";
const path = require("path");
const fs = require("fs-extra");

const debug = require("debug")("mouselight:pipeline-api:pipeline-map-worker");

import {
    PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus, ExecutionStatusCode,
    CompletionStatusCode
} from "./pipelineScheduler";

import {
    connectorForFile, generatePipelineStageTableName, generatePipelineStateDatabaseName, TileStatusPipelineStageId,
    generatePipelineStageInProcessTableName, verifyTable, generatePipelineStageToProcessTableName
} from "../data-access/knexPiplineStageConnection";

import {IPipelineStage, PipelineStages} from "../data-model/pipelineStage";
import {Projects, IProject} from "../data-model/project";

import performanceConfiguration from "../../config/performance.config"
import {PipelineWorkers} from "../data-model/pipelineWorker";
import {PipelineWorkerClient} from "../graphql/client/pipelineWorkerClient";
import {updatePipelineStagePerformance, updatePipelineStageCounts} from "../data-model/pipelineStagePerformance";

const perfConf = performanceConfiguration();

interface IInProcessTile {
    relative_path: string;
    tile_name: string;
    worker_id: string;
    worker_last_seen: Date;
    task_execution_id: string;
    created_at: Date;
    updated_at: Date;
}

interface IPendingTile {
    relative_path: string;
    tile_name: string;
    created_at: Date;
    updated_at: Date;
}

export class PipelineMapScheduler extends PipelineScheduler {
    private _pipelineStage: IPipelineStage;

    private _inProcessTableName: string;

    private _toProcessTableName: string;

    private _inProcessCount: number;

    private _waitingToProcessCount: number;

    public constructor(pipelineStage: IPipelineStage) {
        super();

        this._pipelineStage = pipelineStage;
    }

    public async run() {
        if (this._pipelineStage.previous_stage_id) {
            let pipelineManager = new PipelineStages();

            let previousPipeline = await pipelineManager.get(this._pipelineStage.previous_stage_id);

            this._inputTableName = generatePipelineStageTableName(previousPipeline.id);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(previousPipeline.dst_path), this._inputTableName);
        } else {
            let projectManager = new Projects();

            let project = await projectManager.get(this._pipelineStage.project_id);

            this._inputTableName = generatePipelineStageTableName(TileStatusPipelineStageId);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(project.root_path), this._inputTableName);
        }

        fs.ensureDirSync(this._pipelineStage.dst_path);

        this._outputTableName = generatePipelineStageTableName(this._pipelineStage.id);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._pipelineStage.dst_path), this._outputTableName);

        this._inProcessTableName = generatePipelineStageInProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._inProcessTableName, (table) => {
            table.string(DefaultPipelineIdKey).primary().unique();
            table.string("tile_name");
            table.uuid("worker_id");
            table.timestamp("worker_last_seen");
            table.uuid("task_execution_id");
            table.timestamps();
        });

        this._toProcessTableName = generatePipelineStageToProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._toProcessTableName, (table) => {
            table.string(DefaultPipelineIdKey).primary().unique();
            table.string("tile_name");
            table.timestamps();
        });

        await this.performWork();
    }

    private async performWork() {
        if (this._isCancelRequested) {
            debug("cancel requested - early return");
            return;
        }

        debug(`performing update for ${this._pipelineStage.id}`);

        try {
            // Update the database with the completion status of tiles from the previous stage.  This essentially converts
            // current_stage_is_complete from the previous stage id table to previous_stage_is_complete for this stage.
            let knownInput = await this.inputTable.select(DefaultPipelineIdKey, "this_stage_status", "tile_name");

            if (knownInput.length > 0) {
                let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

                let sorted = this.muxInputOutputTiles(knownInput, knownOutput);

                await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

                await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdatePrevious, DefaultPipelineIdKey);
            } else {
                debug("no input from previous stage yet");
            }

            // Check and update the status of anything in-process
            this._inProcessCount = await this.updateInProcessStatus();

            // If there are no available schedulers, exit

            // Look if anything is already in the to-process queue
            let available = await this.loadAvailableToProcess();

            //   If not, search database for to-process and put in to-process queue
            if (available.length === 0) {
                available = await this.updateToProcessQueue();
            }

            // If there is any to-process, try to fill worker capacity
            if (available.length > 0) {
                await this.scheduleFromList(available);
            }

            this._waitingToProcessCount = await this._outputKnexConnector(this._toProcessTableName).count(DefaultPipelineIdKey);

            updatePipelineStageCounts(this._pipelineStage.id, this._inProcessCount[0][`count("${DefaultPipelineIdKey}")`], this._waitingToProcessCount[0][`count("${DefaultPipelineIdKey}")`]);

        } catch (err) {
            console.log(err);
        }

        debug("resetting timer");

        setTimeout(() => this.performWork(), perfConf.regenTileStatusJsonFileSeconds * 1000)
    }

    private async updateInProcessStatus(): Promise<number> {
        let inProcess = await this.loadInProcess();

        let workerManager = new PipelineWorkers();

        // This should not thousands or even hundreds at a time, just a handful per machine at most per cycle, likely
        // far less depending on how frequently we check, so don't bother with batching for now.
        inProcess.forEach(async(task) => {
            let workerForTask = await workerManager.get(task.worker_id);

            let executionInfo = await PipelineWorkerClient.Instance().queryTaskExecution(workerForTask, task.task_execution_id);

            if (executionInfo != null && executionInfo.execution_status_code === ExecutionStatusCode.Completed) {
                let tileStatus = TilePipelineStatus.Queued;

                switch (executionInfo.completion_status_code) {
                    case CompletionStatusCode.Success:
                        tileStatus = TilePipelineStatus.Complete;
                        break;
                    case CompletionStatusCode.Error:
                        tileStatus = TilePipelineStatus.Failed; // Do not queue again
                        break;
                    case CompletionStatusCode.Cancel:
                        tileStatus = TilePipelineStatus.Incomplete; // Return to incomplete to be queued again
                        break;
                }

                // Tile should be marked complete, not be present in any intermediate tables, and not change again.

                await this._outputKnexConnector(this._outputTableName).where(DefaultPipelineIdKey, task[DefaultPipelineIdKey]).update({this_stage_status: TilePipelineStatus.Complete});

                await this._outputKnexConnector(this._inProcessTableName).where(DefaultPipelineIdKey, task[DefaultPipelineIdKey]).del();

                updatePipelineStagePerformance(this._pipelineStage.id, executionInfo);
            }
        });

        return await this._outputKnexConnector(this._inProcessTableName).count(DefaultPipelineIdKey);
    }

    private async scheduleFromList(availableList: IPendingTile[]) {
        if (!availableList || availableList.length === 0) {
            return;
        }

        debug(`scheduling workers from available ${availableList.length} pending`);

        let projects = new Projects();

        let pipelineStages = new PipelineStages();

        let workerManager = new PipelineWorkers();

        let workers = await workerManager.getAll();

        let project: IProject = await projects.get(this._pipelineStage.project_id);

        let src_path = project.root_path;

        if (this._pipelineStage.previous_stage_id) {
            let previousStage: IPipelineStage = await pipelineStages.get(this._pipelineStage.previous_stage_id);

            src_path = previousStage.dst_path;
        }

        let tasks = new TaskDefinitions();

        let task = await tasks.get(this._pipelineStage.task_id);

        await this.queue(availableList, async(available) => {
            // Will continue until a worker with capacity is found and a task is started.  Workers without capacity
            // return false continuing the iteration.
            debug(`looking for worker for tile ${available[DefaultPipelineIdKey]}`);

            let stillLookingForWorker = await this.queue(workers, async(worker) => {
                // Return true to continue searching for an available worker and false if the task is launched.

                let taskLoad = PipelineWorkers.getWorkerTaskLoad(worker.id);

                debug(`worker ${worker.name} has load ${taskLoad} of capacity ${worker.work_unit_capacity}`);

                if (taskLoad < 0) {
                    // No information
                    debug(`worker ${worker.name} skipped (unknown/unreported task load)`);
                    return true;
                }

                let capacity = worker.work_unit_capacity - taskLoad;

                if (capacity >= task.work_units) {
                    debug(`found worker ${worker.name} with sufficient capacity ${capacity}`);

                    PipelineWorkers.setWorkerTaskLoad(worker.id, taskLoad + task.work_units);

                    let outputPath = path.join(this._pipelineStage.dst_path, available.relative_path);

                    fs.ensureDirSync(outputPath);

                    let args = [project.name, project.root_path, src_path, this._pipelineStage.dst_path, available.relative_path, available.tile_name, "0"];

                    let taskExecution = await PipelineWorkerClient.Instance().startTaskExecution(worker, this._pipelineStage.task_id, args);

                    if (taskExecution != null) {
                        let now = new Date();
                        await this._outputKnexConnector(this._inProcessTableName).insert({
                            relative_path: available.relative_path,
                            tile_name: available.tile_name,
                            worker_id: worker.id,
                            worker_last_seen: now,
                            task_execution_id: taskExecution.id,
                            created_at: now,
                            updated_at: now
                        });

                        await this._outputKnexConnector(this._toProcessTableName).where(DefaultPipelineIdKey, available[DefaultPipelineIdKey]).del();
                    }

                    debug(`started task on worker ${worker.name} with execution id ${taskExecution.id}`);

                    return false;
                }

                debug(`worker ${worker.name} has insufficient capacity ${capacity} of ${worker.work_unit_capacity}`);

                return true;
            });

            debug(`worker search for tile ${available[DefaultPipelineIdKey]} resolves with stillLookingForWorker: ${stillLookingForWorker}`);

            // If result is true, a worker was never found for the last tile so short circuit be returning a promise
            // that resolves to false.  Otherwise, the tile task was launched, so try the next one.

            return Promise.resolve(!stillLookingForWorker);
        });
    }

    private async loadInProcess(): Promise<IInProcessTile[]> {
        debug("loading in-process");

        return await this._outputKnexConnector(this._inProcessTableName).select();
    }

    private async loadAvailableToProcess(): Promise<IPendingTile[]> {
        debug("loading available to-process");

        return await this._outputKnexConnector(this._toProcessTableName).select();
    }

    private async updateToProcessQueue() {
        debug("looking for new to-process");

        let toProcessInsert: IPendingTile[] = [];

        let unscheduled = await this.outputTable.where({
            prev_stage_status: TilePipelineStatus.Complete,
            this_stage_status: TilePipelineStatus.Incomplete,
        });

        if (unscheduled.length > 0) {
            unscheduled = unscheduled.map(obj => {
                obj.this_stage_status = TilePipelineStatus.Queued;
                return obj;
            });

            let now = new Date();

            toProcessInsert = unscheduled.map(obj => {
                return {
                    relative_path: obj.relative_path,
                    tile_name: obj.tile_name,
                    created_at: now,
                    updated_at: now
                };
            });

            debug(`transitioning ${unscheduled.length} tiles to to-process queue`);

            await this.batchInsert(this._outputKnexConnector, this._toProcessTableName, toProcessInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, unscheduled);
        }

        return toProcessInsert;
    }

    private muxInputOutputTiles(knownInput, knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdatePrevious: []
        };

        let knownOutputLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            let idx = knownOutputLookup.indexOf(inputTile[DefaultPipelineIdKey]);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                if (existingOutput.previous_stage_status !== inputTile.this_stage_status) {
                    list.toUpdatePrevious.push({
                        relative_path: inputTile.relative_path,
                        prev_stage_status: inputTile.this_stage_status,
                        x: inputTile.x,
                        y: inputTile.y,
                        z: inputTile.z,
                        lat_x: inputTile.lat_x,
                        lat_y: inputTile.lat_y,
                        lat_z: inputTile.lat_z,
                        cut_offset: inputTile.cut_offset,
                        z_offset: inputTile.z_offset,
                        delta_z: inputTile.delta_z,
                        updated_at: new Date()
                    });
                }
            } else {
                let now = new Date();
                list.toInsert.push({
                    relative_path: inputTile.relative_path,
                    tile_name: inputTile.tile_name,
                    prev_stage_status: inputTile.this_stage_status,
                    this_stage_status: TilePipelineStatus.Incomplete,
                    x: inputTile.x,
                    y: inputTile.y,
                    z: inputTile.z,
                    lat_x: inputTile.lat_x,
                    lat_y: inputTile.lat_y,
                    lat_z: inputTile.lat_z,
                    cut_offset: inputTile.cut_offset,
                    z_offset: inputTile.z_offset,
                    delta_z: inputTile.delta_z,
                    created_at: now,
                    updated_at: now
                });
            }

            return list;
        }, sorted);

        return sorted;
    }
}

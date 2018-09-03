import {Instance, Model, Transaction} from "sequelize";
import {IProject} from "./project";

export enum PipelineStageMethod {
    DashboardProjectRefresh = 1,
    MapTile = 2,
    XAdjacentTileComparison = 3,
    YAdjacentTileComparison = 4,
    ZAdjacentTileComparison = 5
}

export interface IPipelineStageAttributes {
    id?: string;
    name?: string;
    description?: string;
    dst_path?: string;
    function_type?: PipelineStageMethod;
    depth?: number;
    is_processing?: boolean;
    project_id?: string;
    previous_stage_id?: string;
    task_id?: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export interface IPipelineStage extends Instance<IPipelineStageAttributes>, IPipelineStageAttributes {
    getProject(): Promise<IProject[]>;
}

export interface IPipelineStageTable extends Model<IPipelineStage, IPipelineStageAttributes> {
    createFromInput(stageInput: IPipelineStageAttributes): Promise<IPipelineStage>;
    remove(transaction: Transaction, id: string): Promise<IPipelineStage>;
    getForProject(project_id: string): Promise<IPipelineStage[]>;
    getForTask(task_id: string): Promise<IPipelineStage[]>;
}

export const TableName = "PipelineStages";

export function sequelizeImport(sequelize, DataTypes) {
    const PipelineStage = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        dst_path: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        function_type: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        depth: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_processing: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true
    });

    PipelineStage.associate = models => {
        PipelineStage.belongsTo(models.Projects, {foreignKey: "project_id"});
        PipelineStage.belongsTo(models.PipelineStages, {foreignKey: "previous_stage_id"});
        PipelineStage.belongsTo(models.TaskDefinitions, {foreignKey: "task_id"});
    };

    PipelineStage.createFromInput = async (stageInput: IPipelineStageAttributes): Promise<IPipelineStageAttributes> => {
        let previousDepth = 0;

        if (stageInput.previous_stage_id) {
            let previousStage = await PipelineStage.findById(stageInput.previous_stage_id);

            if (previousStage) {
                previousDepth = previousStage.depth;
            }
        }

        let pipelineStage = {
            name: stageInput.name,
            description: stageInput.description,
            project_id: stageInput.project_id,
            task_id: stageInput.task_id,
            previous_stage_id: stageInput.previous_stage_id,
            dst_path: stageInput.dst_path,
            is_processing: false,
            function_type: stageInput.function_type,
            depth: previousDepth + 1
        };

        return PipelineStage.create(pipelineStage);
    };

    PipelineStage.remove = async (t: Transaction, id: string): Promise<string> => {
        const stage: IPipelineStage = await PipelineStage.findById(id);

        if (stage) {
            const children: IPipelineStage[] = await PipelineStage.findAll({where: {previous_stage_id: id}});

            await Promise.all(children.map(async (c) => {
                return c.update({previous_stage_id: stage.previous_stage_id});
            }));

            await PipelineStage.destroy({where: {id}});
        }

        return id;
    };

    PipelineStage.getForProject = async (project_id: string): Promise<IPipelineStage[]> => project_id ? await PipelineStage.findAll({where: {project_id}}) : [];

    PipelineStage.getForTask = async (task_id: string): Promise<IPipelineStage[]> => task_id ? await PipelineStage.findAll({where: {task_id}}) : [];

    return PipelineStage;
}

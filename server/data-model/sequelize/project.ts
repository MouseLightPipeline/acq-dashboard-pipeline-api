import {Instance, Model} from "sequelize";
import {IPipelineStage} from "./pipelineStage";

export const NO_BOUND: number = null;
export const NO_SAMPLE: number = -1;

export enum ProjectInputSourceState {
    Unknown = 0,
    BadLocation = 1,
    Missing = 2,
    Dashboard = 3,
    Pipeline = 4,
    Disappeared = 5
}

export interface IProjectGridRegion {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
}

export interface IProjectInput {
    id?: string;
    name?: string;
    description?: string;
    root_path?: string;
    is_processing?: boolean;
    sample_number?: number;
    region_bounds?: IProjectGridRegion;
    region_z_max?: number;
    user_parameters?: string;
    plane_markers?: string;
    zPlaneSkipIndices?: number[];
    input_source_state?: ProjectInputSourceState;
    last_seen_input_source?: Date;
    last_checked_input_source?: Date;
}

export interface IProjectAttributes {
    id?: string;
    name?: string;
    description?: string;
    root_path?: string;
    log_root_path?: string;
    sample_number?: number;
    sample_x_min?: number;
    sample_x_max?: number;
    sample_y_min?: number;
    sample_y_max?: number;
    sample_z_min?: number;
    sample_z_max?: number;
    region_x_min?: number;
    region_x_max?: number;
    region_y_min?: number;
    region_y_max?: number;
    region_z_min?: number;
    region_z_max?: number;
    user_parameters?: string;
    plane_markers?: string;
    is_processing?: boolean;
    input_source_state?: ProjectInputSourceState;
    last_seen_input_source?: Date;
    last_checked_input_source?: Date;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export interface IProject extends Instance<IProjectAttributes>, IProjectAttributes {
    planeMarkers: any;
    zPlaneSkipIndices: number[];

    getStages(): Promise<IPipelineStage[]>
}

export interface IProjectTable extends Model<IProject, IProjectAttributes> {
}

export const TableName = "Projects";

export function sequelizeImport(sequelize, DataTypes) {
    const Project = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.TEXT
        },
        description: {
            type: DataTypes.TEXT
        },
        root_path: {
            type: DataTypes.TEXT
        },
        log_root_path: {
            type: DataTypes.TEXT
        },
        sample_number: {
            type: DataTypes.INTEGER
        },
        sample_x_min: {
            type: DataTypes.DOUBLE
        },
        sample_x_max: {
            type: DataTypes.DOUBLE
        },
        sample_y_min: {
            type: DataTypes.DOUBLE
        },
        sample_y_max: {
            type: DataTypes.DOUBLE
        },
        sample_z_min: {
            type: DataTypes.DOUBLE
        },
        sample_z_max: {
            type: DataTypes.DOUBLE
        },
        region_x_min: {
            type: DataTypes.DOUBLE
        },
        region_x_max: {
            type: DataTypes.DOUBLE
        },
        region_y_min: {
            type: DataTypes.DOUBLE
        },
        region_y_max: {
            type: DataTypes.DOUBLE
        },
        region_z_min: {
            type: DataTypes.DOUBLE
        },
        region_z_max: {
            type: DataTypes.DOUBLE
        },
        user_parameters: {
            type: DataTypes.TEXT,
        },
        plane_markers: {
            type: DataTypes.TEXT,
        },
        is_processing: {
            type: DataTypes.BOOLEAN
        },
        input_source_state: {
            type: DataTypes.INTEGER
        },
        last_seen_input_source: {
            type: DataTypes.DATE
        },
        last_checked_input_source: {
            type: DataTypes.DATE
        },
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        getterMethods: {
            planeMarkers: function() {
                return JSON.parse(this.plane_markers);
            },
            zPlaneSkipIndices: function() {
                return this.planeMarkers.z;
            }
        },
        setterMethods: {
            planeMarkers: function(value) {
                this.setDataValue("plane_markers", JSON.stringify(value));
            },
            zPlaneSkipIndices: function(value) {
                this.setDataValue("zPlaneSkipIndices", JSON.stringify(Object.assign({}, this.planeMarkers, {z: value})));
            }
        }
    });

    Project.associate = models => {
        Project.hasMany(models.PipelineStages, {foreignKey: "project_id", as: {singular: "stage", plural: "stages"}});
    };

    return Project;
}

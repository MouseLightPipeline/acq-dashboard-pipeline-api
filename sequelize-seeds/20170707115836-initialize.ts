import * as path from "path";

const seedEnv = process.env.PIPELINE_SEED_ENV || "production";
const isProduction = seedEnv === "production";

const locationPrefix = process.env.PIPELINE_SEED_PREFIX || "/opt/pipeline/";

export = {
    up: async (queryInterface, Sequelize) => {
        const when = new Date();

        await queryInterface.bulkInsert("TaskRepositories", createTaskRepositories(when), {});
        await queryInterface.bulkInsert("TaskDefinitions", createTaskDefinitions(when), {});
        await queryInterface.bulkInsert("Projects", createProjects(when), {});
        await queryInterface.bulkInsert("PipelineStages", createPipelineStages(when), {});
        await queryInterface.bulkInsert("PipelineStageFunctions", createPipelineStageFunction(when), {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete("PipelineStageFunctions", null, {});
        await queryInterface.bulkDelete("PipelineStages", null, {});
        await queryInterface.bulkDelete("Projects", null, {});
        await queryInterface.bulkDelete("TaskDefinitions", null, {});
        await queryInterface.bulkDelete("askRepositories", null, {});
    }
};

function createTaskRepositories(when: Date) {
    if (isProduction) {
        return [{
            id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            name: "Default",
            description: "Default task repository.",
            location: path.join(locationPrefix, "taskdefinitions/default"),
            created_at: when
        }];
    } else {
        return [{
            id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            name: "Default",
            description: "Default task repository.",
            location: path.join(locationPrefix, "taskdefinitions/default"),
            created_at: when
        }, {
            id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            name: "Development",
            description: "Development task repository.",
            location: path.join(locationPrefix, "taskdefinitions/development"),
            created_at: when
        }];
    }
}

function createTaskDefinitions(when: Date) {
    if (isProduction) {
        return [{
            id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
            name: "Axon UInt16",
            description: "Axon UInt16",
            script: "axon-uint16.sh",
            interpreter: "none",
            args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
            work_units: 4,
            task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            created_at: when
        }, {
            id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
            name: "dogDescriptor",
            description: "",
            script: "dogDescriptor.sh",
            interpreter: "none",
            args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
            work_units: 2,
            task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            created_at: when
        }, {
            id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
            name: "getDescriptorPerTile",
            description: "",
            script: "getDescriptorPerTile.sh",
            interpreter: "none",
            args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
            work_units: 1,
            task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            created_at: when
        }];
    } else {
        return [{
            id: "04b8313e-0e96-4194-9c06-22771acd3986",
            name: "Echo",
            description: "Simple command to test shell worker execution.  Will echo all arguments.",
            script: "echo.sh",
            interpreter: "none",
            args: `"custom arg 1" "custom arg 2"`,
            work_units: 0,
            task_repository_id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            created_at: when
        }, {
            id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
            name: "ilastik Pixel Classifier Test",
            description: "Calls ilastik with test project.",
            script: "pixel_shell.sh",
            interpreter: "none",
            args: "test/pixel_classifier_test",
            work_units: 4,
            task_repository_id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            created_at: when
        }, {
            id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
            name: "dogDescriptor",
            description: "",
            script: "dogDescriptor.sh",
            interpreter: "none",
            args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor",
            work_units: 2,
            task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            created_at: when
        }, {
            id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
            name: "getDescriptorPerTile",
            description: "",
            script: "getDescriptorPerTile.sh",
            interpreter: "none",
            args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor/getDescriptorPerTile",
            work_units: 1,
            task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
            created_at: when
        }];
    }
}

function createProjects(when: Date) {
    if (isProduction) {
        return [{
            id: "44e49773-1c19-494b-b283-54466b94b70f",
            name: "Sample Brain",
            description: "Sample brain pipeline project",
            root_path: "/groups/mousebrainmicro/mousebrainmicro/from_tier2/data/2016-10-31/Tiling",
            sample_number: 99998,
            region_x_min: 277,
            region_x_max: 281,
            region_y_min: 35,
            region_y_max: 39,
            region_z_min: 388,
            region_z_max: 392,
            is_processing: false,
            created_at: when
        }];
    } else {
        return [{
            id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
            name: "Small",
            description: "Small dashboard.json test project",
            root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
            sample_number: 99998,
            region_x_min: null,
            region_x_max: null,
            region_y_min: null,
            region_y_max: null,
            region_z_min: null,
            region_z_max: null,
            is_processing: false,
            created_at: when
        }, {
            id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            name: "Small SubGrid",
            description: "Small dashboard.json test project",
            root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
            sample_number: 99998,
            region_x_min: 1,
            region_x_max: 2,
            region_y_min: 0,
            region_y_max: 3,
            region_z_min: 2,
            region_z_max: null,
            is_processing: false,
            created_at: when
        }, {
            id: "b7b7952c-a830-4237-a3de-dcd2a388a04a",
            name: "Large",
            description: "Large dashboard.json test project",
            root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/large",
            sample_number: 99999,
            region_x_min: null,
            region_x_max: null,
            region_y_min: null,
            region_y_max: null,
            region_z_min: null,
            region_z_max: null,
            is_processing: false,
            created_at: when
        }];
    }
}

function createPipelineStages(when: Date) {
    if (isProduction) {
        return [{
            id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
            name: "Classifier",
            description: "Classifier",
            dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_1_classifier_output",
            function_type: 2,
            is_processing: false,
            depth: 1,
            project_id: "44e49773-1c19-494b-b283-54466b94b70f",
            task_id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
            previous_stage_id: null,
            created_at: when
        }, {
            id: "5188b927-4c50-4f97-b22b-b123da78dad6",
            name: "Descriptors",
            description: "Descriptors",
            dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_2_descriptor_output",
            function_type: 2,
            is_processing: false,
            depth: 2,
            project_id: "44e49773-1c19-494b-b283-54466b94b70f",
            task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
            previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
            created_at: when
        }, {
            id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
            name: "Merge Descriptors",
            description: "Descriptor Merge",
            dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_3_descriptor_merge",
            function_type: 2,
            is_processing: false,
            depth: 3,
            project_id: "44e49773-1c19-494b-b283-54466b94b70f",
            task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
            previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
            created_at: when
        }];
    } else {
        return [{
            id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
            name: "Classifier",
            description: "Classifier",
            dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput1",
            function_type: 2,
            is_processing: false,
            depth: 1,
            project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
            task_id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
            previous_stage_id: null,
            created_at: when
        }, {
            id: "5188b927-4c50-4f97-b22b-b123da78dad6",
            name: "Descriptors",
            description: "Descriptors",
            dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput2",
            function_type: 2,
            is_processing: false,
            depth: 2,
            project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
            task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
            previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
            created_at: when
        }, {
            id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
            name: "Merge Descriptors",
            description: "Descriptor Merge",
            dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput3",
            function_type: 2,
            is_processing: false,
            depth: 3,
            project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
            task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
            previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
            created_at: when
        }];
    }
}

function createPipelineStageFunction(when: Date) {
    return [{
        id: 1,
        name: "Refresh Dashboard Project",
        created_at: when
    }, {
        id: 2,
        name: "Map Tile",
        created_at: when
    }, {
        id: 3,
        name: "Map With Z Index - 1 Tile",
        created_at: when
    }];
}
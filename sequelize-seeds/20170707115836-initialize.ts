import * as path from "path";

const seedEnv = process.env.PIPELINE_SEED_ENV || "production";
const isDevelopment = seedEnv !== "production";

// Samples are archived periodically.  The data used for testing/configuration needs to be changed periodically.
const sampleBrainProject = process.env.PIPELINE_SEED_SAMPLE_PROJECT || "2019-05-27";
const skeletonizationProject = process.env.PIPELINE_SEED_SKELETONIZATION_PROJECT || "2017-09-25";

const taskLocationPrefix = process.env.PIPELINE_SEED_TASK_ROOT || "/data/code/pipeline";
const appLocationPrefix = process.env.PIPELINE_SEED_APP_ROOT || "/apps";
const toolsLocationPrefix = process.env.PIPELINE_SEED_APP_ROOT || "/tools";
const dataLocationPrefix = process.env.PIPELINE_SEED_DATA_ROOT || "/data/input/";
const outputLocationPrefix = process.env.PIPELINE_SEED_OUTPUT_ROOT || "/data/output/";
const sampleBrainStageOutputBasePath = path.join(outputLocationPrefix, sampleBrainProject);

const mcrPath = path.join(toolsLocationPrefix, "mcr");
const mcrv92Path = path.join(mcrPath, "v92");
const mcrv95Path = path.join(mcrPath, "v95");

const anacondaPath = path.join(toolsLocationPrefix, "python", "anaconda3");

enum TaskArgumentType {
    Literal = 0,
    Parameter = 1
}

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
        await queryInterface.bulkDelete("TaskRepositories", null, {});
    }
};

function createTaskRepositories(when: Date) {
    const repos = [{
        id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        name: "Default",
        description: "Default task repository.",
        location: path.join(taskLocationPrefix, "pipeline-task-definitions", "default"),
        created_at: when
    }];
    if (isDevelopment) {
        repos.push(...[{
            id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            name: "Development",
            description: "Development task repository.",
            location: path.join(taskLocationPrefix, "pipeline-task-definitions", "development"),
            created_at: when
        }]);
    }

    return repos;
}

function createTaskDefinitions(when: Date) {
    const tasks = [{
        id: "ae111b6e-2187-4e07-8ccf-bc7d425d95af",
        name: "Line Fix",
        description: "",
        script: "lineFix.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: path.join(appLocationPrefix, "lineFix"),
                type: TaskArgumentType.Literal
            }, {
                value: anacondaPath,
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 2 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 2,
        cluster_work_units: 1,
        log_prefix: "lf",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
        name: "Axon UInt16",
        description: "",
        script: "axon-uint16.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${IS_CLUSTER_JOB}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "axon-classifier", "axon_uint16.ilp"),
                type: TaskArgumentType.Literal
            }, {
                value: path.join(toolsLocationPrefix, "ilastik-1.1.9-Linux"),
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 4 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 18,
        cluster_work_units: 1,
        log_prefix: "ax",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
        name: "Descriptors",
        description: "",
        script: "dogDescriptor.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "dogDescriptor"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv92Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 4 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 4,
        cluster_work_units: 1,
        log_prefix: "dd",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "9772fd49-29be-419e-99a6-9e34ebe2f8f9",
        name: "Descriptor Skel",
        description: "",
        script: "skelDescriptor.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "skelDescriptor", "configfiles", "2018-08-15.cfg"),
                type: TaskArgumentType.Literal
            }, {
                value: path.join(appLocationPrefix, "skelDescriptor"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv92Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 4 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 1,
        cluster_work_units: 1,
        log_prefix: "skd",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "9285c4d3-80c2-473c-81d2-f42078ae3136",
        name: "Descriptor Vessel",
        description: "",
        script: "vesselDescriptor.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "skelDescriptor", "configfiles", "2018-08-15.cfg"),
                type: TaskArgumentType.Literal
            }, {
                value: path.join(appLocationPrefix, "vesselDescriptor"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv95Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 4 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 1,
        cluster_work_units: 1,
        log_prefix: "skd",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
        name: "Point Match",
        description: "",
        script: "pointMatch.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${PROJECT_ROOT}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${ADJACENT_TILE_RELATIVE_PATH}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "pointmatch"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv92Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }, {
                value: "[0,0,0]",
                type: TaskArgumentType.Literal
            }, {
                value: "1",
                type: TaskArgumentType.Literal
            }, {
                value: "10000",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 2 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 1,
        cluster_work_units: 1,
        log_prefix: "pm",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "1b711b74-a1ff-42e9-a5de-03773fab9346",
        name: "Point Match Vessel",
        description: "literals:\nApp, mcr, relative shift, channel id, max num of descriptors",
        script: "pointMatch_vessel.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${PROJECT_ROOT}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${ADJACENT_TILE_RELATIVE_PATH}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "pointmatch_vessel"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv95Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }, {
                value: "[0,0,0]",
                type: TaskArgumentType.Literal
            }, {
                value: "1",
                type: TaskArgumentType.Literal
            }, {
                value: "10000",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 2 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 2,
        cluster_work_units: 2,
        log_prefix: "pmv",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "1080bb16-3c60-4612-a476-de486d70386d",
        name: "Skeletonization",
        description: "",
        script: "skeletonization.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${X}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${Y}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${Z}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${STEP_X}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${STEP_Y}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${STEP_Z}",
                type: TaskArgumentType.Parameter
            }, {
                value: "/data/external/skeletonization/20170925_prob0_lev-6_chunk-111_111_masked-0.h5",
                type: TaskArgumentType.Literal
            }, {
                value: "/prob0",
                type: TaskArgumentType.Literal
            }, {
                value: path.join(appLocationPrefix, "skeletonization/config_files/20170925_prob0_config_skelh5.cfg"),
                type: TaskArgumentType.Literal
            }, {
                value: path.join(appLocationPrefix, "skeletonization/cluster_skelh5"),
                type: TaskArgumentType.Literal
            }, {
                value: mcrv92Path,
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: ["-n 2 -P mouselight"]}),
        expected_exit_code: 0,
        local_work_units: 2,
        cluster_work_units: 1,
        log_prefix: "sk",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }, {
        id: "99990f9f-8951-4fbb-a632-41c52ed0c277",
        name: "Compression",
        description: "",
        script: "compression.sh",
        interpreter: "none",
        script_args: JSON.stringify({
            arguments: [{
                value: "${EXPECTED_EXIT_CODE}",
                type: TaskArgumentType.Parameter
            }, {
                value: "${TASK_ID}",
                type: TaskArgumentType.Parameter
            }, {
                value: path.join(appLocationPrefix, "tif2mj", "tif2mj"),
                type: TaskArgumentType.Literal
            }, {
                value: "10",
                type: TaskArgumentType.Literal
            }, {
                value: "1",
                type: TaskArgumentType.Literal
            }, {
                value: "/home",
                type: TaskArgumentType.Literal
            }]
        }),
        cluster_args: JSON.stringify({arguments: [""]}),
        expected_exit_code: 0,
        local_work_units: 1,
        cluster_work_units: 1,
        log_prefix: "pm",
        task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
        created_at: when
    }];

    if (isDevelopment) {
        tasks.push(...[{
            id: "04b8313e-0e96-4194-9c06-22771acd3986",
            name: "Echo",
            description: "Simple command to test shell worker execution.  Will echo all arguments.",
            script: "echo.sh",
            interpreter: "none",
            script_args: JSON.stringify({
                arguments: [{
                    value: `"custom arg 1"`,
                    type: TaskArgumentType.Literal
                }, {value: `"custom arg 2"`, type: TaskArgumentType.Literal}]
            }),
            cluster_args: JSON.stringify({arguments: [""]}),
            expected_exit_code: 0,
            local_work_units: 1,
            cluster_work_units: 1,
            log_prefix: "ec",
            task_repository_id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            created_at: when
        }, {
            id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
            name: "ilastik Pixel Classifier Test",
            description: "Calls ilastik with test project.",
            script: "pixel_shell.sh",
            interpreter: "none",
            script_args: JSON.stringify({
                arguments: [{
                    value: "${EXPECTED_EXIT_CODE}",
                    type: TaskArgumentType.Parameter
                }, {
                    value: path.join(toolsLocationPrefix, "pipeline-task-definitions", "development", "test", "pixel_classifier_test"),
                    type: TaskArgumentType.Literal
                }, {
                    value: path.join(toolsLocationPrefix, "ilastik-1.1.9-Linux"),
                    type: TaskArgumentType.Literal
                }]
            }),
            cluster_args: JSON.stringify({arguments: [""]}),
            expected_exit_code: 0,
            local_work_units: 4,
            cluster_work_units: 1,
            log_prefix: "ax",
            task_repository_id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
            created_at: when
        }]);
    }

    return tasks;
}

function createProjects(when: Date) {
    const projects = [{
        id: "44e49773-1c19-494b-b283-54466b94b70f",
        name: "Sample Brain",
        description: "Example brain pipeline project.",
        root_path: path.join(dataLocationPrefix, sampleBrainProject, "Tiling"),
        log_root_path: "",
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
        id: "74f684fb-9e9f-4b2e-b853-4c43a3b92f38",
        name: "Sample Skeletonization",
        description: "Example skeletonization project.",
        root_path: path.join(dataLocationPrefix, "skeletonization", skeletonizationProject),
        log_root_path: "",
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

    if (isDevelopment) {
        projects.push(...[{
            id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            name: "SubGrid",
            description: "SubGrid test project.",
            root_path: path.join(dataLocationPrefix, sampleBrainProject, "Tiling"),
            log_root_path: "",
            sample_number: 99998,
            region_x_min: 1,
            region_x_max: 2,
            region_y_min: 1,
            region_y_max: 2,
            region_z_min: 1,
            region_z_max: 2,
            is_processing: false,
            created_at: when
        }]);
    }

    return projects;
}

function createPipelineStages(when: Date) {
    const stages = [{
        id: "90e86015-65c9-44b9-926d-deaced40ddaa",
        name: "Line Fix",
        description: "Line Fix",
        dst_path: path.join(sampleBrainStageOutputBasePath, "stage-1-line-fix-output"),
        function_type: 2,
        is_processing: false,
        depth: 1,
        project_id: "44e49773-1c19-494b-b283-54466b94b70f",
        task_id: "ae111b6e-2187-4e07-8ccf-bc7d425d95af",
        previous_stage_id: null,
        created_at: when
    }, {
        id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
        name: "Classifier",
        description: "Classifier",
        dst_path: path.join(sampleBrainStageOutputBasePath, "stage-2-classifier-output"),
        function_type: 2,
        is_processing: false,
        depth: 2,
        project_id: "44e49773-1c19-494b-b283-54466b94b70f",
        task_id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
        previous_stage_id: "90e86015-65c9-44b9-926d-deaced40ddaa",
        created_at: when
    }, {
        id: "5188b927-4c50-4f97-b22b-b123da78dad6",
        name: "Descriptors",
        description: "Descriptors",
        dst_path: path.join(sampleBrainStageOutputBasePath, "stage-3-descriptor-output"),
        function_type: 2,
        is_processing: false,
        depth: 3,
        project_id: "44e49773-1c19-494b-b283-54466b94b70f",
        task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
        previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
        created_at: when
    }, {
        id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
        name: "Point Match",
        description: "Point Match",
        dst_path: path.join(sampleBrainStageOutputBasePath, "stage-4-point-match-output"),
        function_type: 5,
        is_processing: false,
        depth: 4,
        project_id: "44e49773-1c19-494b-b283-54466b94b70f",
        task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
        previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
        created_at: when
    }, {
        id: "47900297-aa80-439e-8148-80c3a439aa54",
        name: "Skeletonization",
        description: "Skeletonization",
        dst_path: path.join(outputLocationPrefix, "skeletonization", skeletonizationProject, "stage-1-skeletonization-output"),
        function_type: 2,
        is_processing: false,
        depth: 1,
        project_id: "74f684fb-9e9f-4b2e-b853-4c43a3b92f38",
        task_id: "1080bb16-3c60-4612-a476-de486d70386d",
        previous_stage_id: null,
        created_at: when
    }];

    if (isDevelopment) {
        stages.push(...[{
            id: "90e86015-65c9-44b9-926d-deaced40dda0",
            name: "Line Fix",
            description: "Line Fix",
            dst_path: path.join(outputLocationPrefix, "subgrid", "stage-1-line-fix-output"),
            function_type: 2,
            is_processing: false,
            depth: 1,
            project_id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            task_id: "ae111b6e-2187-4e07-8ccf-bc7d425d95af",
            previous_stage_id: null,
            created_at: when
        }, {
            id: "828276a5-44c0-4bd1-87f7-9495bc3e9f60",
            name: "Classifier",
            description: "Classifier",
            dst_path: path.join(outputLocationPrefix, "subgrid", "stage-1-classifier-output"),
            function_type: 2,
            is_processing: false,
            depth: 1,
            project_id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            task_id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
            previous_stage_id: null,
            created_at: when
        }, {
            id: "5188b927-4c50-4f97-b22b-b123da78dad0",
            name: "Descriptors",
            description: "Descriptors",
            dst_path: path.join(outputLocationPrefix, "subgrid", "stage-2-descriptor-output"),
            function_type: 2,
            is_processing: false,
            depth: 2,
            project_id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
            previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f60",
            created_at: when
        }, {
            id: "2683ad99-e389-41fd-a54c-38834ccc7ae0",
            name: "Point Match",
            description: "Point Match",
            dst_path: path.join(outputLocationPrefix, "subgrid", "stage-3-point-match-output"),
            function_type: 5,
            is_processing: false,
            depth: 3,
            project_id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
            task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
            previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad0",
            created_at: when
        }]);
    }

    return stages;
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
        name: "Map With X Index - 1 Tile",
        created_at: when
    }, {
        id: 4,
        name: "Map With Y Index - 1 Tile",
        created_at: when
    }, {
        id: 5,
        name: "Map With Z Index - 1 Tile",
        created_at: when
    }];
}
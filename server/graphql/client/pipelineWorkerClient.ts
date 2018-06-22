import ApolloClient, {createNetworkInterface} from "apollo-client";
import gql from "graphql-tag";
import "isomorphic-fetch";

const debug = require("debug")("pipeline:coordinator-api:pipeline-worker-client");

import {IPipelineWorker, PipelineWorkerStatus} from "../../data-model/sequelize/pipelineWorker";
import {PipelineServerContext} from "../pipelineServerContext";


export interface IClientWorker {
    id: string;
    local_work_capacity: number;
    cluster_work_capacity: number;
}

export interface IClientUpdateWorkerOutput {
    worker: IClientWorker;
    error: string;
}

export class PipelineWorkerClient {
    private static _instance: PipelineWorkerClient = null;

    public static Instance(): PipelineWorkerClient {
        if (PipelineWorkerClient._instance === null) {
            PipelineWorkerClient._instance = new PipelineWorkerClient();
        }

        return PipelineWorkerClient._instance;
    }

    private _idClientMap = new Map<string, ApolloClient>();

    private getClient(worker: IPipelineWorker): ApolloClient {
        if (worker === null) {
            return null;
        }

        let client = this._idClientMap[worker.id];

        let uri = null;

        if (client == null) {
            try {
                uri = `http://${worker.address}:${worker.port}/graphql`;

                debug(`creating apollo client with uri ${uri}`);
                const networkInterface = createNetworkInterface({uri});

                client = new ApolloClient({
                    networkInterface
                });

                this._idClientMap[worker.id] = client;
            } catch (err) {
                debug(`failed to create apollo client with uri ${uri}`);

                client = null;
            }
        }

        return client;
    }

    private static async markWorkerUnavailable(worker: IPipelineWorker): Promise<void> {
        let serverContext = new PipelineServerContext();

        const row = await serverContext.getPipelineWorker(worker.id);

        row.status = PipelineWorkerStatus.Unavailable;
    }

    public async updateWorker(worker: IPipelineWorker): Promise<IClientUpdateWorkerOutput> {
        const client = this.getClient(worker);

        if (client === null) {
            return {worker: null, error: "Could not connect to worker"};
        }

        try {
            let response = await client.mutate({
                mutation: gql`
                mutation UpdateWorkerMutation($worker: WorkerInput) {
                    updateWorker(worker: $worker) {
                        id
                        local_work_capacity
                        cluster_work_capacity
                    }
                }`,
                variables: {
                    worker: Object.assign({}, {id: worker.id, local_work_capacity: worker.local_work_capacity, cluster_work_capacity: worker.cluster_work_capacity})
                }
            });

            return {worker: response.data.updateWorker, error: null};
        } catch (err) {
            await PipelineWorkerClient.markWorkerUnavailable(worker);
            debug(`error submitting update to worker ${worker.name}`);

            return {worker: null, error: err};
        }
    }
}
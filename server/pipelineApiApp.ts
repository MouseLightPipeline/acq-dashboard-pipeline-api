import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";

const debug = require("debug")("pipeline:coordinator-api:server");

import {graphQLMiddleware, graphiQLMiddleware} from "./graphql/common/graphQLMiddleware";
import {SocketIoServer} from "./io/ioServer";
import {SchedulerHub} from "./schedulers/schedulerHub";
import {ServiceOptions} from "./options/serverOptions";
import {thumbnailParamQueryMiddleware, thumbnailQueryMiddleware} from "./middleware/thumbnailQueryMiddleware";

const useChildProcessWorkers = process.env.USE_CHILD_PROCESS_WORKERS || false;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

app.use(ServiceOptions.graphQlEndpoint, graphQLMiddleware());

app.use("/thumbnailData", cors(), thumbnailQueryMiddleware);

app.use("/thumbnail/:pipelineStageId/:x/:y/:z/:thumbName", cors(), thumbnailParamQueryMiddleware);

app.use(["/", ServiceOptions.graphiQlEndpoint], graphiQLMiddleware(ServiceOptions));

SchedulerHub.Run(useChildProcessWorkers).then(() => {
    const server = SocketIoServer.use(app);

    server.listen(ServiceOptions.port, () => {
        debug(`running on http://localhost:${ServiceOptions.port}`);
    });
});

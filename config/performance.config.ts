import {IConfiguration} from "./configuration";

interface IPerformanceConfig {
    regenTileStatusJsonFileSeconds: number;
    regenTileStatusSqliteChunkSize: number;
}

const configurations: IConfiguration<IPerformanceConfig> = {
    development: {
        regenTileStatusJsonFileSeconds: 10,
        regenTileStatusSqliteChunkSize: 100
    },
    test: {
        regenTileStatusJsonFileSeconds: 90,
        regenTileStatusSqliteChunkSize: 100
    },
    production: {
        regenTileStatusJsonFileSeconds: 300,
        regenTileStatusSqliteChunkSize: 100
    }
};

export default function (): IPerformanceConfig {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
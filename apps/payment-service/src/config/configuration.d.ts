export interface AppConfiguration {
    app: {
        port: number;
        corsOrigins: string[];
        nodeEnv: string;
    };
    database: {
        url: string;
    };
}
declare const _default: () => AppConfiguration;
export default _default;

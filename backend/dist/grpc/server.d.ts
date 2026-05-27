export declare class GrpcSwarmServer {
    private server;
    private port;
    constructor();
    start(): Promise<number>;
    getPort(): number;
    stop(): void;
    private handlePipeData;
}

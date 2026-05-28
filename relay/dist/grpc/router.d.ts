export declare class GrpcRelayRouter {
    private server;
    private port;
    private ipAddress;
    private bridges;
    constructor();
    start(): Promise<number>;
    getPort(): number;
    getIp(): string;
    stop(): void;
    createTransferSession(): string;
    private handlePipeData;
    private handleReceivePipe;
}

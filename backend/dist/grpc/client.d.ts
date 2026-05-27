export declare class GrpcSwarmClient {
    private client;
    constructor(ipAddress: string, port: number);
    pipeStream(transferId: string, stream: NodeJS.ReadableStream): Promise<any>;
}

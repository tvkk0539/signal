export declare class GrpcSwarmClient {
    private client;
    constructor(ipAddress: string, port: number);
    receivePipe(transferId: string, onData: (chunk: Buffer) => void, onEnd: () => void, onError: (err: Error) => void): Promise<void>;
    pipeStream(transferId: string, stream: NodeJS.ReadableStream): Promise<any>;
}

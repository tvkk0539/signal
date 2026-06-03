import { ChildProcess } from 'child_process';
export declare class VfsIndexerService {
    private isConnected;
    private workerId;
    private readonly BATCH_SIZE;
    constructor(workerId: string);
    connect(uri: string): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Processes a massive JSON stream natively and buffers DB inserts.
     * Prevents loading 10GB JSON files into Node RAM.
     */
    streamAndIndexFastList(rcloneProcess: ChildProcess, remoteAlias: string, isEphemeral: boolean, ttlMinutes?: number): Promise<void>;
    /**
     * Heartbeat to push the Dead Man's Switch forward.
     */
    pulseHeartbeat(ttlMinutes?: number): Promise<void>;
}

export declare class RcloneDaemonManager {
    private rcloneProcess;
    private isRunning;
    start(): Promise<void>;
    stop(): void;
    ping(): Promise<boolean>;
    listFiles(fs?: string, path?: string): Promise<any[]>;
    getRemotes(): Promise<any[]>;
    streamFile(fs: string, path: string, startByte?: number, endByte?: number): Promise<NodeJS.ReadableStream>;
}

export declare class RcloneDaemonManager {
    private rcloneProcess;
    private isRunning;
    start(): Promise<void>;
    stop(): void;
    ping(): Promise<boolean>;
    listFiles(fs?: string, path?: string): Promise<any[]>;
    getRemotes(): Promise<any[]>;
    statFile(fs: string, path: string): Promise<any>;
    uploadDirectory(localPath: string, remoteFs: string, remotePath: string): Promise<void>;
    streamFile(fs: string, path: string, startByte?: number, endByte?: number): Promise<NodeJS.ReadableStream>;
}

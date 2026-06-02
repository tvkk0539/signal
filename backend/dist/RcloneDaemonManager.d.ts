export declare class RcloneDaemonManager {
    private rcloneProcess;
    private isRunning;
    private configPath;
    mergeAndApplyConfig(ephemeralConfig: string, permanentConfig: string): Promise<void>;
    start(): Promise<void>;
    stop(): void;
    ping(): Promise<boolean>;
    listFiles(fs?: string, path?: string): Promise<any[]>;
    /**
     * Generates a massive mathematical tree of the entire remote using fast-list.
     * This operates purely in Rclone's memory and is heavily paginated.
     */
    buildVfsTree(fsName: string): Promise<any[]>;
    getRemotes(): Promise<any[]>;
    statFile(fs: string, path: string): Promise<any>;
    uploadDirectory(localPath: string, remoteFs: string, remotePath: string): Promise<void>;
    streamFile(fs: string, path: string, startByte?: number, endByte?: number): Promise<NodeJS.ReadableStream>;
}

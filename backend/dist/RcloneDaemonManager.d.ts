import { ChildProcess } from 'child_process';
export interface RcloneConfigBlock {
    alias: string;
    configText: string;
}
export declare class RcloneDaemonManager {
    private rcloneProcess;
    private isRunning;
    private configPath;
    /**
     * Phase 11: Hybrid Configuration Engine
     * Generates the dynamic isolated /tmp/rclone.conf by merging Permanent and Ephemeral blocks.
     */
    generateHybridConfig(permanentBlocks: RcloneConfigBlock[], ephemeralBlocks: RcloneConfigBlock[]): void;
    start(permanentBlocks?: RcloneConfigBlock[], ephemeralBlocks?: RcloneConfigBlock[]): Promise<void>;
    stop(): void;
    ping(): Promise<boolean>;
    listFiles(fs?: string, path?: string): Promise<any[]>;
    deleteFile(fs: string, path: string): Promise<void>;
    moveFile(srcFs: string, srcPath: string, dstFs: string, dstPath: string): Promise<void>;
    copyFile(srcFs: string, srcPath: string, dstFs: string, dstPath: string): Promise<void>;
    getRemotes(): Promise<any[]>;
    statFile(fs: string, path: string): Promise<any>;
    uploadDirectory(localPath: string, remoteFs: string, remotePath: string): Promise<void>;
    /**
     * Phase 11: Massive Index Stream
     * Runs the `fast-list` command as a child process and returns the stream
     * to prevent loading a multi-gigabyte JSON tree into RAM.
     */
    streamFastList(remoteName: string): ChildProcess;
    streamFile(fs: string, path: string, startByte?: number, endByte?: number): Promise<NodeJS.ReadableStream>;
}

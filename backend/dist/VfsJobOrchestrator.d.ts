import { RcloneDaemonManager } from './RcloneDaemonManager';
export declare class VfsJobOrchestrator {
    private rcloneManager;
    private activeJobs;
    constructor(rcloneManager: RcloneDaemonManager);
    executeBatchAction(jobId: string, action: 'move' | 'copy', srcFs: string, dstFs: string, paths: {
        src: string;
        dst: string;
    }[], onProgress: (progressStr: string) => void, onComplete: (success: boolean, error?: string) => void): void;
    private executeSingle;
    cancelJob(jobId: string): void;
    private formatPath;
}

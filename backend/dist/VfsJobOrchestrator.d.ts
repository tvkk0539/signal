import { RcloneDaemonManager } from './RcloneDaemonManager';
export declare class VfsJobOrchestrator {
    private rcloneManager;
    private activeJobs;
    constructor(rcloneManager: RcloneDaemonManager);
    executeBatchAction(jobId: string, action: 'move' | 'copy', srcFs: string, dstFs: string, paths: {
        src: string;
        dst: string;
    }[], advancedConfig: {
        transfers?: number;
        checkers?: number;
        driveChunkSize?: string;
        serverSideAcrossConfigs?: boolean;
        tpslimit?: number;
    } | undefined, onProgress: (progressStr: string) => void, onComplete: (success: boolean, error?: string) => void): void;
    private executeSingle;
    cancelJob(jobId: string): void;
    private formatPath;
}

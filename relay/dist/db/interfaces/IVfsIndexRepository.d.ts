export interface VfsFileRecord {
    id?: string;
    remoteAlias: string;
    path: string;
    name: string;
    size: number;
    mimeType: string;
    modTime: Date;
    isDirectory: boolean;
    isEphemeral: boolean;
    workerId?: string;
    expiresAt?: Date;
}
export interface RcloneConfigBlock {
    alias: string;
    rcloneName: string;
    configText: string;
    isEphemeral: boolean;
    workerId?: string;
}
export interface IVfsIndexRepository {
    saveConfigBlock(block: RcloneConfigBlock): Promise<void>;
    getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]>;
    deleteConfigBlock(alias: string): Promise<void>;
    bulkUpsertFiles(files: VfsFileRecord[]): Promise<void>;
    searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]>;
    refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void>;
    purgeRemoteIndex(remoteAlias: string): Promise<void>;
}

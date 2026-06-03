import { IVfsIndexRepository, VfsFileRecord, RcloneConfigBlock } from '../../interfaces/IVfsIndexRepository';
export declare class InMemoryVfsIndexRepository implements IVfsIndexRepository {
    private files;
    private configs;
    saveConfigBlock(block: RcloneConfigBlock): Promise<void>;
    getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]>;
    deleteConfigBlock(alias: string): Promise<void>;
    bulkUpsertFiles(records: VfsFileRecord[]): Promise<void>;
    searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]>;
    refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void>;
    purgeRemoteIndex(remoteAlias: string): Promise<void>;
    getDistinctAliases(): Promise<string[]>;
}

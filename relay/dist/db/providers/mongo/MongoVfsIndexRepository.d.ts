import { Connection } from 'mongoose';
import { IVfsIndexRepository, VfsFileRecord, RcloneConfigBlock } from '../../interfaces/IVfsIndexRepository';
export declare class MongoVfsIndexRepository implements IVfsIndexRepository {
    private fileModel;
    private configModel;
    constructor(connection: Connection);
    saveConfigBlock(block: RcloneConfigBlock): Promise<void>;
    getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]>;
    deleteConfigBlock(alias: string): Promise<void>;
    bulkUpsertFiles(files: VfsFileRecord[]): Promise<void>;
    searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]>;
    refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void>;
    purgeRemoteIndex(remoteAlias: string): Promise<void>;
    getDistinctAliases(): Promise<string[]>;
}

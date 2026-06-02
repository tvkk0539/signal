import { IVfsIndexRepository } from '../../interfaces/IVfsIndexRepository';
import { VfsIndexItem } from '@swarm/shared';
export declare class MongoVfsIndexRepository implements IVfsIndexRepository {
    upsertTree(workerId: string, remoteName: string, isPermanent: boolean, files: VfsIndexItem[], persistentId?: string): Promise<void>;
    search(query: string, limit?: number): Promise<VfsIndexItem[]>;
    purgeEphemeralByWorker(workerId: string): Promise<void>;
}

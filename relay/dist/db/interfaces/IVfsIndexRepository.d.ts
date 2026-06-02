import { VfsIndexItem } from '@swarm/shared';
export interface IVfsIndexRepository {
    upsertTree(workerId: string, remoteName: string, isPermanent: boolean, files: VfsIndexItem[], persistentId?: string): Promise<void>;
    search(query: string, limit?: number): Promise<VfsIndexItem[]>;
    purgeEphemeralByWorker(workerId: string): Promise<void>;
}

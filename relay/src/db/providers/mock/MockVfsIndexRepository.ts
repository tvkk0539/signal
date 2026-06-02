import { IVfsIndexRepository } from '../../interfaces/IVfsIndexRepository';
import { VfsIndexItem } from '@swarm/shared';

export class MockVfsIndexRepository implements IVfsIndexRepository {
    private ephemeralCache: Map<string, VfsIndexItem[]> = new Map();
    private permanentCache: Map<string, VfsIndexItem[]> = new Map();

    async upsertTree(workerId: string, remoteName: string, isPermanent: boolean, files: VfsIndexItem[], persistentId?: string): Promise<void> {
        console.log(`[MockVfsIndex] Upserting tree for ${remoteName} (worker: ${workerId}, permanent: ${isPermanent})`);
        if (isPermanent && persistentId) {
            this.permanentCache.set(persistentId, files);
        } else {
            const key = `${workerId}_${remoteName}`;
            this.ephemeralCache.set(key, files);
        }
    }

    async search(query: string, limit: number = 50): Promise<VfsIndexItem[]> {
        const results: VfsIndexItem[] = [];
        const lowerQuery = query.toLowerCase();

        const searchInCache = (cache: Map<string, VfsIndexItem[]>) => {
            for (const files of cache.values()) {
                for (const file of files) {
                    if (file.name.toLowerCase().includes(lowerQuery)) {
                        results.push(file);
                        if (results.length >= limit) return results;
                    }
                }
            }
            return results;
        };

        const res1 = searchInCache(this.permanentCache);
        if (res1.length >= limit) return res1;
        return searchInCache(this.ephemeralCache);
    }

    async purgeEphemeralByWorker(workerId: string): Promise<void> {
        let purgedCount = 0;
        for (const [key, _files] of this.ephemeralCache.entries()) {
            if (key.startsWith(`${workerId}_`)) {
                this.ephemeralCache.delete(key);
                purgedCount++;
            }
        }
        if (purgedCount > 0) {
            console.log(`[MockVfsIndex] Purged ${purgedCount} ephemeral trees for dead worker ${workerId}`);
        }
    }
}

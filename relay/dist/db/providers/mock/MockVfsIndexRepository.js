"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockVfsIndexRepository = void 0;
class MockVfsIndexRepository {
    ephemeralCache = new Map();
    permanentCache = new Map();
    async upsertTree(workerId, remoteName, isPermanent, files, persistentId) {
        console.log(`[MockVfsIndex] Upserting tree for ${remoteName} (worker: ${workerId}, permanent: ${isPermanent})`);
        if (isPermanent && persistentId) {
            this.permanentCache.set(persistentId, files);
        }
        else {
            const key = `${workerId}_${remoteName}`;
            this.ephemeralCache.set(key, files);
        }
    }
    async search(query, limit = 50) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        const searchInCache = (cache) => {
            for (const files of cache.values()) {
                for (const file of files) {
                    if (file.name.toLowerCase().includes(lowerQuery)) {
                        results.push(file);
                        if (results.length >= limit)
                            return results;
                    }
                }
            }
            return results;
        };
        const res1 = searchInCache(this.permanentCache);
        if (res1.length >= limit)
            return res1;
        return searchInCache(this.ephemeralCache);
    }
    async purgeEphemeralByWorker(workerId) {
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
exports.MockVfsIndexRepository = MockVfsIndexRepository;

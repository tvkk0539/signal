"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedVfsIndexRepository = void 0;
class ReplicatedVfsIndexRepository {
    primary;
    mirrors;
    constructor(primary, mirrors = []) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async upsertTree(workerId, remoteName, isPermanent, files, persistentId) {
        await this.primary.upsertTree(workerId, remoteName, isPermanent, files, persistentId);
        for (const mirror of this.mirrors) {
            mirror.upsertTree(workerId, remoteName, isPermanent, files, persistentId).catch(err => {
                console.error(`[DB Mirror Error - VFS Index Upsert]:`, err);
            });
        }
    }
    async search(query, limit) {
        return this.primary.search(query, limit);
    }
    async purgeEphemeralByWorker(workerId) {
        await this.primary.purgeEphemeralByWorker(workerId);
        for (const mirror of this.mirrors) {
            mirror.purgeEphemeralByWorker(workerId).catch(err => {
                console.error(`[DB Mirror Error - VFS Index Purge]:`, err);
            });
        }
    }
}
exports.ReplicatedVfsIndexRepository = ReplicatedVfsIndexRepository;

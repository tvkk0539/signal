"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedVfsIndexRepository = void 0;
class ReplicatedVfsIndexRepository {
    primary;
    mirrors;
    constructor(primary, mirrors) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async saveConfigBlock(block) {
        await this.primary.saveConfigBlock(block);
        this.mirrors.forEach(mirror => mirror.saveConfigBlock(block).catch(e => console.error('Mirror Sync Error (VFS Config):', e)));
    }
    async getConfigBlocks(isEphemeral, workerId) {
        return this.primary.getConfigBlocks(isEphemeral, workerId);
    }
    async deleteConfigBlock(alias) {
        await this.primary.deleteConfigBlock(alias);
        this.mirrors.forEach(mirror => mirror.deleteConfigBlock(alias).catch(e => console.error('Mirror Sync Error (VFS Config):', e)));
    }
    async bulkUpsertFiles(files) {
        await this.primary.bulkUpsertFiles(files);
        // Note: Replicating massive bulk inserts to mirrors asynchronously.
        this.mirrors.forEach(mirror => mirror.bulkUpsertFiles(files).catch(e => console.error('Mirror Sync Error (VFS Bulk Insert):', e)));
    }
    async searchFiles(query, limit, remoteAlias) {
        // Reads always go to primary
        return this.primary.searchFiles(query, limit, remoteAlias);
    }
    async refreshWorkerHeartbeat(workerId, ttlMinutes) {
        await this.primary.refreshWorkerHeartbeat(workerId, ttlMinutes);
        this.mirrors.forEach(mirror => mirror.refreshWorkerHeartbeat(workerId, ttlMinutes).catch(e => { }));
    }
    async purgeRemoteIndex(remoteAlias) {
        await this.primary.purgeRemoteIndex(remoteAlias);
        this.mirrors.forEach(mirror => mirror.purgeRemoteIndex(remoteAlias).catch(e => { }));
    }
}
exports.ReplicatedVfsIndexRepository = ReplicatedVfsIndexRepository;

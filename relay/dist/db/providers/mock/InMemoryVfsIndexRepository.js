"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryVfsIndexRepository = void 0;
class InMemoryVfsIndexRepository {
    files = new Map();
    configs = new Map();
    async saveConfigBlock(block) {
        this.configs.set(block.alias, block);
    }
    async getConfigBlocks(isEphemeral, workerId) {
        const results = [];
        for (const block of this.configs.values()) {
            let match = true;
            if (isEphemeral !== undefined && block.isEphemeral !== isEphemeral)
                match = false;
            if (workerId !== undefined && block.workerId !== workerId)
                match = false;
            if (match)
                results.push(block);
        }
        return results;
    }
    async deleteConfigBlock(alias) {
        this.configs.delete(alias);
    }
    async bulkUpsertFiles(records) {
        for (const file of records) {
            const key = `${file.remoteAlias}::${file.path}`;
            this.files.set(key, file);
        }
    }
    async searchFiles(query, limit, remoteAlias) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        for (const file of this.files.values()) {
            if (remoteAlias && file.remoteAlias !== remoteAlias)
                continue;
            if (query && !file.name.toLowerCase().includes(lowerQuery))
                continue;
            results.push(file);
            if (results.length >= limit)
                break;
        }
        return results;
    }
    async refreshWorkerHeartbeat(workerId, ttlMinutes) {
        const newExpiry = new Date(Date.now() + ttlMinutes * 60000);
        for (const [key, file] of this.files.entries()) {
            if (file.workerId === workerId && file.isEphemeral) {
                file.expiresAt = newExpiry;
            }
        }
    }
    async purgeRemoteIndex(remoteAlias) {
        for (const [key, file] of this.files.entries()) {
            if (file.remoteAlias === remoteAlias) {
                this.files.delete(key);
            }
        }
    }
}
exports.InMemoryVfsIndexRepository = InMemoryVfsIndexRepository;

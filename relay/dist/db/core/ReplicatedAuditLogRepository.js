"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedAuditLogRepository = void 0;
class ReplicatedAuditLogRepository {
    primary;
    mirrors;
    constructor(primary, mirrors = []) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async createLog(log) {
        const createdLog = await this.primary.createLog(log);
        this.mirrors.forEach(mirror => {
            mirror.createLog(createdLog).catch(err => {
                console.error(`[Replication Engine] Mirror write failed for AuditLog ${createdLog.jobId}:`, err);
            });
        });
        return createdLog;
    }
    async getLogsByJobId(jobId) {
        return this.primary.getLogsByJobId(jobId);
    }
    async getLogsByWorkerId(workerId) {
        return this.primary.getLogsByWorkerId(workerId);
    }
}
exports.ReplicatedAuditLogRepository = ReplicatedAuditLogRepository;

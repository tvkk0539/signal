"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuditLogRepository = void 0;
class InMemoryAuditLogRepository {
    logs = [];
    currentId = 1;
    async createLog(log) {
        const newLog = {
            ...log,
            id: (this.currentId++).toString()
        };
        this.logs.push(newLog);
        return newLog;
    }
    async getLogsByJobId(jobId) {
        return this.logs
            .filter(log => log.jobId === jobId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    async getLogsByWorkerId(workerId) {
        return this.logs
            .filter(log => log.workerId === workerId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
}
exports.InMemoryAuditLogRepository = InMemoryAuditLogRepository;

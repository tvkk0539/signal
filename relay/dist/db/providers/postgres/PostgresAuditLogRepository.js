"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresAuditLogRepository = void 0;
class PostgresAuditLogRepository {
    connectionString;
    constructor(connectionString) {
        this.connectionString = connectionString || '';
        console.log(`[Postgres] Initialized Audit Log Repository mapping.`);
    }
    async createLog(log) {
        console.log(`[Postgres] (Stub) createLog: ${log.jobId}`);
        return { ...log, id: `pg-log-${Date.now()}` };
    }
    async getLogsByJobId(jobId) {
        return [];
    }
    async getLogsByWorkerId(workerId) {
        return [];
    }
}
exports.PostgresAuditLogRepository = PostgresAuditLogRepository;

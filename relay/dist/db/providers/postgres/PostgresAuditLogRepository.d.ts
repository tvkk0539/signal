import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import type { JobAuditLog } from '@swarm/shared';
export declare class PostgresAuditLogRepository implements IAuditLogRepository {
    private connectionString;
    constructor(connectionString?: string);
    createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog>;
    getLogsByJobId(jobId: string): Promise<JobAuditLog[]>;
    getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]>;
}

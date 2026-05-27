import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import { JobAuditLog } from '@swarm/shared';
export declare class InMemoryAuditLogRepository implements IAuditLogRepository {
    private logs;
    private currentId;
    createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog>;
    getLogsByJobId(jobId: string): Promise<JobAuditLog[]>;
    getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]>;
}

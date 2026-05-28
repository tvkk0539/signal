import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';
import { JobAuditLog } from '@swarm/shared';
export declare class ReplicatedAuditLogRepository implements IAuditLogRepository {
    private primary;
    private mirrors;
    constructor(primary: IAuditLogRepository, mirrors?: IAuditLogRepository[]);
    createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog>;
    getLogsByJobId(jobId: string): Promise<JobAuditLog[]>;
    getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]>;
}

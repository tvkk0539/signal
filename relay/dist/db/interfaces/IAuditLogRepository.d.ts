import { JobAuditLog } from '@swarm/shared';
export interface IAuditLogRepository {
    createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog>;
    getLogsByJobId(jobId: string): Promise<JobAuditLog[]>;
    getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]>;
}

import { Connection } from 'mongoose';
import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import { JobAuditLog } from '@swarm/shared';
export declare class MongoAuditLogRepository implements IAuditLogRepository {
    private logModel;
    constructor(connection: Connection);
    createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog>;
    getLogsByJobId(jobId: string): Promise<JobAuditLog[]>;
    getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]>;
}

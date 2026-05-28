import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';
import { JobAuditLog } from '@swarm/shared';

export class ReplicatedAuditLogRepository implements IAuditLogRepository {
  constructor(
    private primary: IAuditLogRepository,
    private mirrors: IAuditLogRepository[] = []
  ) {}

  async createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog> {
    const createdLog = await this.primary.createLog(log);

    this.mirrors.forEach(mirror => {
      // See ReplicatedUserRepository note on `insertWithId`. We pass the full log here
      // (casting to any) so the mirror can attempt to preserve the primary's ID if the adapter supports it.
      mirror.createLog(createdLog as any).catch(err => {
        console.error(`[Replication Engine] Mirror write failed for AuditLog ${createdLog.jobId}:`, err);
      });
    });

    return createdLog;
  }

  async getLogsByJobId(jobId: string): Promise<JobAuditLog[]> {
    return this.primary.getLogsByJobId(jobId);
  }

  async getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]> {
    return this.primary.getLogsByWorkerId(workerId);
  }
}

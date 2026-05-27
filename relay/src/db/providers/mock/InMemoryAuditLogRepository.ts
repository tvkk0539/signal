import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import { JobAuditLog } from '@swarm/shared';

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private logs: JobAuditLog[] = [];
  private currentId = 1;

  async createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog> {
    const newLog: JobAuditLog = {
      ...log,
      id: (this.currentId++).toString()
    };
    this.logs.push(newLog);
    return newLog;
  }

  async getLogsByJobId(jobId: string): Promise<JobAuditLog[]> {
    return this.logs
      .filter(log => log.jobId === jobId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]> {
    return this.logs
      .filter(log => log.workerId === workerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

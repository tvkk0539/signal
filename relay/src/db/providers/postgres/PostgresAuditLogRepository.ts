import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import type { JobAuditLog } from '@swarm/shared';

export class PostgresAuditLogRepository implements IAuditLogRepository {
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || '';
    console.log(`[Postgres] Initialized Audit Log Repository mapping.`);
  }

  async createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog> {
    console.log(`[Postgres] (Stub) createLog: ${log.jobId}`);
    return { ...log, id: `pg-log-${Date.now()}` };
  }

  async getLogsByJobId(jobId: string): Promise<JobAuditLog[]> {
    return [];
  }

  async getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]> {
    return [];
  }
}

import { Connection, Model } from 'mongoose';
import { IAuditLogRepository } from '../../interfaces/IAuditLogRepository';
import { JobAuditLogSchema, IJobAuditLogDocument } from './schemas/AuditLogSchema';
import { JobAuditLog } from '@swarm/shared';

export class MongoAuditLogRepository implements IAuditLogRepository {
  private logModel: Model<IJobAuditLogDocument>;

  constructor(connection: Connection) {
    this.logModel = connection.model<IJobAuditLogDocument>('JobAuditLog', JobAuditLogSchema);
  }

  async createLog(log: Omit<JobAuditLog, 'id'>): Promise<JobAuditLog> {
    const newLog = new this.logModel(log);
    const saved = await newLog.save();
    return {
      id: saved._id.toString(),
      jobId: saved.jobId,
      workerId: saved.workerId,
      action: saved.action,
      status: saved.status,
      bytesTransferred: saved.bytesTransferred,
      timestamp: saved.timestamp
    };
  }

  async getLogsByJobId(jobId: string): Promise<JobAuditLog[]> {
    const logs = await this.logModel.find({ jobId }).sort({ timestamp: -1 });
    return logs.map(saved => ({
      id: saved._id.toString(),
      jobId: saved.jobId,
      workerId: saved.workerId,
      action: saved.action,
      status: saved.status,
      bytesTransferred: saved.bytesTransferred,
      timestamp: saved.timestamp
    }));
  }

  async getLogsByWorkerId(workerId: string): Promise<JobAuditLog[]> {
    const logs = await this.logModel.find({ workerId }).sort({ timestamp: -1 });
    return logs.map(saved => ({
      id: saved._id.toString(),
      jobId: saved.jobId,
      workerId: saved.workerId,
      action: saved.action,
      status: saved.status,
      bytesTransferred: saved.bytesTransferred,
      timestamp: saved.timestamp
    }));
  }
}

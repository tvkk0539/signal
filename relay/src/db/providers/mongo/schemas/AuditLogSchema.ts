import mongoose, { Schema, Document } from 'mongoose';
import { JobAuditLog } from '@swarm/shared';

export interface IJobAuditLogDocument extends Omit<JobAuditLog, 'id'>, Document {}

export const JobAuditLogSchema: Schema = new Schema({
  jobId: { type: String, required: true },
  workerId: { type: String, required: true },
  action: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'CANCELLED'], required: true },
  bytesTransferred: { type: Number, required: false },
  timestamp: { type: Date, required: true, default: Date.now }
});


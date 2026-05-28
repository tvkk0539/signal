import { Schema, Document } from 'mongoose';
import { JobAuditLog } from '@swarm/shared';
export interface IJobAuditLogDocument extends Omit<JobAuditLog, 'id'>, Document {
}
export declare const JobAuditLogSchema: Schema;

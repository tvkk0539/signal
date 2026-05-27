import mongoose, { Document } from 'mongoose';
import { JobAuditLog } from '@swarm/shared';
export interface IJobAuditLogDocument extends Omit<JobAuditLog, 'id'>, Document {
}
export declare const JobAuditLogModel: mongoose.Model<IJobAuditLogDocument, {}, {}, {}, mongoose.Document<unknown, {}, IJobAuditLogDocument, {}, mongoose.DefaultSchemaOptions> & IJobAuditLogDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IJobAuditLogDocument>;

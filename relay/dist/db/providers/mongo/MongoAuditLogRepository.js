"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAuditLogRepository = void 0;
const AuditLogSchema_1 = require("./schemas/AuditLogSchema");
class MongoAuditLogRepository {
    async createLog(log) {
        const newLog = new AuditLogSchema_1.JobAuditLogModel(log);
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
    async getLogsByJobId(jobId) {
        const logs = await AuditLogSchema_1.JobAuditLogModel.find({ jobId }).sort({ timestamp: -1 });
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
    async getLogsByWorkerId(workerId) {
        const logs = await AuditLogSchema_1.JobAuditLogModel.find({ workerId }).sort({ timestamp: -1 });
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
exports.MongoAuditLogRepository = MongoAuditLogRepository;

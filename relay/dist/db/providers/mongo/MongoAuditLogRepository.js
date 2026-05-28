"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAuditLogRepository = void 0;
const AuditLogSchema_1 = require("./schemas/AuditLogSchema");
class MongoAuditLogRepository {
    logModel;
    constructor(connection) {
        this.logModel = connection.model('JobAuditLog', AuditLogSchema_1.JobAuditLogSchema);
    }
    async createLog(log) {
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
    async getLogsByJobId(jobId) {
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
    async getLogsByWorkerId(workerId) {
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
exports.MongoAuditLogRepository = MongoAuditLogRepository;

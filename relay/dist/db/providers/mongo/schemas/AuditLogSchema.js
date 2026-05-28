"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAuditLogSchema = void 0;
const mongoose_1 = require("mongoose");
exports.JobAuditLogSchema = new mongoose_1.Schema({
    jobId: { type: String, required: true },
    workerId: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'CANCELLED'], required: true },
    bytesTransferred: { type: Number, required: false },
    timestamp: { type: Date, required: true, default: Date.now }
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RcloneConfigSchema = exports.VfsFileSchema = void 0;
const mongoose_1 = require("mongoose");
exports.VfsFileSchema = new mongoose_1.Schema({
    remoteAlias: { type: String, required: true, index: true },
    path: { type: String, required: true },
    name: { type: String, required: true, index: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    modTime: { type: Date, required: true },
    isDirectory: { type: Boolean, required: true },
    isEphemeral: { type: Boolean, required: true, index: true },
    workerId: { type: String, index: true },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } } // TTL Index!
});
// Compound index for fast searching and upsert uniqueness
exports.VfsFileSchema.index({ name: 'text', path: 'text' });
exports.VfsFileSchema.index({ remoteAlias: 1, path: 1 }, { unique: true });
exports.RcloneConfigSchema = new mongoose_1.Schema({
    alias: { type: String, required: true, unique: true },
    rcloneName: { type: String, required: true },
    configText: { type: String, required: true },
    isEphemeral: { type: Boolean, required: true },
    workerId: { type: String }
});

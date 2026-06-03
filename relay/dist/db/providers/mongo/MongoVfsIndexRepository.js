"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoVfsIndexRepository = void 0;
const VfsIndexSchema_1 = require("./schemas/VfsIndexSchema");
class MongoVfsIndexRepository {
    fileModel;
    configModel;
    constructor(connection) {
        this.fileModel = connection.model('VfsFile', VfsIndexSchema_1.VfsFileSchema);
        this.configModel = connection.model('RcloneConfig', VfsIndexSchema_1.RcloneConfigSchema);
    }
    async saveConfigBlock(block) {
        await this.configModel.findOneAndUpdate({ alias: block.alias }, { $set: block }, { new: true, upsert: true }).exec();
    }
    async getConfigBlocks(isEphemeral, workerId) {
        const query = {};
        if (isEphemeral !== undefined)
            query.isEphemeral = isEphemeral;
        if (workerId !== undefined)
            query.workerId = workerId;
        const docs = await this.configModel.find(query).lean().exec();
        return docs.map(d => ({
            alias: d.alias,
            rcloneName: d.rcloneName,
            configText: d.configText,
            isEphemeral: d.isEphemeral,
            workerId: d.workerId
        }));
    }
    async deleteConfigBlock(alias) {
        await this.configModel.deleteOne({ alias }).exec();
    }
    async bulkUpsertFiles(files) {
        if (files.length === 0)
            return;
        const ops = files.map(file => ({
            updateOne: {
                filter: { remoteAlias: file.remoteAlias, path: file.path },
                update: { $set: file },
                upsert: true
            }
        }));
        // Perform highly efficient bulk write for massive streams
        await this.fileModel.bulkWrite(ops, { ordered: false });
    }
    async searchFiles(query, limit, remoteAlias) {
        const filter = {};
        if (query) {
            // Use regex for partial matching (or text index if fully configured)
            filter.name = { $regex: query, $options: 'i' };
        }
        if (remoteAlias) {
            filter.remoteAlias = remoteAlias;
        }
        const docs = await this.fileModel.find(filter).limit(limit).lean().exec();
        return docs.map(d => ({
            id: d._id.toString(),
            remoteAlias: d.remoteAlias,
            path: d.path,
            name: d.name,
            size: d.size,
            mimeType: d.mimeType,
            modTime: d.modTime,
            isDirectory: d.isDirectory,
            isEphemeral: d.isEphemeral,
            workerId: d.workerId,
            expiresAt: d.expiresAt
        }));
    }
    async refreshWorkerHeartbeat(workerId, ttlMinutes) {
        const newExpiry = new Date(Date.now() + ttlMinutes * 60000);
        // Push the Dead Man's Switch forward for all ephemeral files owned by this worker
        await this.fileModel.updateMany({ workerId: workerId, isEphemeral: true }, { $set: { expiresAt: newExpiry } }).exec();
    }
    async purgeRemoteIndex(remoteAlias) {
        await this.fileModel.deleteMany({ remoteAlias }).exec();
    }
}
exports.MongoVfsIndexRepository = MongoVfsIndexRepository;

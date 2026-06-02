"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoVfsIndexRepository = void 0;
const VfsIndexSchema_1 = require("./schemas/VfsIndexSchema");
class MongoVfsIndexRepository {
    async upsertTree(workerId, remoteName, isPermanent, files, persistentId) {
        console.log(`[MongoVfsIndex] Upserting tree of ${files.length} files for ${remoteName} (Permanent: ${isPermanent})`);
        if (isPermanent && persistentId) {
            // Highly Engineered: Delta Upsert for Permanent remotes to save DB IO
            const bulkOps = files.map(file => ({
                updateOne: {
                    filter: { persistentId, id: file.id },
                    update: { $set: { ...file, isPermanent, createdAt: new Date() } },
                    upsert: true
                }
            }));
            if (bulkOps.length > 0) {
                await VfsIndexSchema_1.VfsIndexModel.bulkWrite(bulkOps, { ordered: false });
            }
        }
        else {
            // Ephemeral: Purge old tree for this worker/remote combo, then insert massive new tree
            await VfsIndexSchema_1.VfsIndexModel.deleteMany({ workerId, remoteName, isPermanent: false });
            const docsToInsert = files.map(f => ({
                ...f,
                workerId,
                remoteName,
                isPermanent: false
            }));
            // Insert in massive chunks for speed
            if (docsToInsert.length > 0) {
                await VfsIndexSchema_1.VfsIndexModel.insertMany(docsToInsert, { ordered: false });
            }
        }
    }
    async search(query, limit = 50) {
        // Lightning fast search utilizing Mongoose Text Index
        const docs = await VfsIndexSchema_1.VfsIndexModel.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } })
            .limit(limit)
            .lean();
        // Convert back to DTO
        return docs.map(doc => ({
            id: doc.id,
            remoteName: doc.remoteName,
            path: doc.path,
            name: doc.name,
            size: doc.size,
            mimeType: doc.mimeType,
            isDir: doc.isDir,
            workerId: doc.workerId,
            persistentId: doc.persistentId
        }));
    }
    async purgeEphemeralByWorker(workerId) {
        const result = await VfsIndexSchema_1.VfsIndexModel.deleteMany({ workerId, isPermanent: false });
        if (result.deletedCount > 0) {
            console.log(`[MongoVfsIndex] 🧹 SELF-CLEANING TRIGGERED: Purged ${result.deletedCount} ephemeral files for dead worker ${workerId}`);
        }
    }
}
exports.MongoVfsIndexRepository = MongoVfsIndexRepository;

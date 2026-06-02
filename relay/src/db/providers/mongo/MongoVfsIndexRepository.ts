import { IVfsIndexRepository } from '../../interfaces/IVfsIndexRepository';
import { VfsIndexItem } from '@swarm/shared';
import { VfsIndexModel } from './schemas/VfsIndexSchema';

export class MongoVfsIndexRepository implements IVfsIndexRepository {
    async upsertTree(workerId: string, remoteName: string, isPermanent: boolean, files: VfsIndexItem[], persistentId?: string): Promise<void> {
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
                await VfsIndexModel.bulkWrite(bulkOps, { ordered: false });
            }
        } else {
            // Ephemeral: Purge old tree for this worker/remote combo, then insert massive new tree
            await VfsIndexModel.deleteMany({ workerId, remoteName, isPermanent: false });

            const docsToInsert = files.map(f => ({
                ...f,
                workerId,
                remoteName,
                isPermanent: false
            }));

            // Insert in massive chunks for speed
            if (docsToInsert.length > 0) {
                await VfsIndexModel.insertMany(docsToInsert, { ordered: false });
            }
        }
    }

    async search(query: string, limit: number = 50): Promise<VfsIndexItem[]> {
        // Lightning fast search utilizing Mongoose Text Index
        const docs = await VfsIndexModel.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } }
        )
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

    async purgeEphemeralByWorker(workerId: string): Promise<void> {
        const result = await VfsIndexModel.deleteMany({ workerId, isPermanent: false });
        if (result.deletedCount > 0) {
            console.log(`[MongoVfsIndex] 🧹 SELF-CLEANING TRIGGERED: Purged ${result.deletedCount} ephemeral files for dead worker ${workerId}`);
        }
    }
}

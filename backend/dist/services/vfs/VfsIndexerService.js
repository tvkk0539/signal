"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VfsIndexerService = void 0;
// @ts-ignore
const JSONStream_1 = __importDefault(require("JSONStream"));
const mongoose_1 = __importDefault(require("mongoose"));
// Ensure the schema definition exactly matches what is on the Relay Server
// so the worker can inject directly into the same collection safely.
const VfsFileSchema = new mongoose_1.default.Schema({
    remoteAlias: { type: String, required: true, index: true },
    path: { type: String, required: true },
    name: { type: String, required: true, index: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    modTime: { type: Date, required: true },
    isDirectory: { type: Boolean, required: true },
    isEphemeral: { type: Boolean, required: true, index: true },
    workerId: { type: String, index: true },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
});
// Avoid re-compiling schema if this file is hot-reloaded
const FileModel = mongoose_1.default.models.VfsFile || mongoose_1.default.model('VfsFile', VfsFileSchema);
class VfsIndexerService {
    isConnected = false;
    workerId;
    BATCH_SIZE = 5000; // Optimal bulk insert limit
    constructor(workerId) {
        this.workerId = workerId;
    }
    async connect(uri) {
        if (this.isConnected)
            return;
        console.log(`[VFS Indexer] Direct Bypass: Connecting to MongoDB at ${uri.split('@').pop()}`);
        await mongoose_1.default.connect(uri);
        this.isConnected = true;
        console.log(`[VFS Indexer] Connected to MongoDB Bypass.`);
    }
    async disconnect() {
        if (!this.isConnected)
            return;
        await mongoose_1.default.disconnect();
        this.isConnected = false;
        console.log(`[VFS Indexer] Disconnected from MongoDB Bypass.`);
    }
    /**
     * Processes a massive JSON stream natively and buffers DB inserts.
     * Prevents loading 10GB JSON files into Node RAM.
     */
    async streamAndIndexFastList(rcloneProcess, remoteAlias, isEphemeral, ttlMinutes = 5) {
        if (!this.isConnected)
            throw new Error("Not connected to DB bypass");
        console.log(`[VFS Indexer] Starting JSON Stream Parse for ${remoteAlias}`);
        return new Promise((resolve, reject) => {
            let batch = [];
            let totalProcessed = 0;
            const flushBatch = async (items) => {
                if (items.length === 0)
                    return;
                const ops = items.map(item => ({
                    updateOne: {
                        filter: { remoteAlias: remoteAlias, path: item.Path },
                        update: {
                            $set: {
                                remoteAlias: remoteAlias,
                                path: item.Path,
                                name: item.Name,
                                size: item.Size || 0,
                                mimeType: item.MimeType || 'application/octet-stream',
                                modTime: new Date(item.ModTime || Date.now()),
                                isDirectory: item.IsDir || false,
                                isEphemeral: isEphemeral,
                                workerId: this.workerId,
                                // Apply the Dead Man's Switch TTL only if ephemeral
                                ...(isEphemeral ? { expiresAt: new Date(Date.now() + ttlMinutes * 60000) } : {})
                            }
                        },
                        upsert: true
                    }
                }));
                try {
                    await FileModel.bulkWrite(ops, { ordered: false });
                }
                catch (e) {
                    console.error(`[VFS Indexer] Bulk Write Error (Sample): ${e.message}`);
                }
            };
            // rclone lsjson outputs an array `[ { ... }, { ... } ]`. We want to parse every object inside the root array.
            const jsonStream = JSONStream_1.default.parse('*');
            if (!rcloneProcess.stdout) {
                return reject(new Error("No stdout stream on rclone process"));
            }
            rcloneProcess.stdout.pipe(jsonStream);
            jsonStream.on('data', async (item) => {
                batch.push(item);
                totalProcessed++;
                if (batch.length >= this.BATCH_SIZE) {
                    // Pause stream to prevent runaway memory if DB is slower than rclone
                    jsonStream.pause();
                    const currentBatch = [...batch];
                    batch = []; // Reset batch
                    await flushBatch(currentBatch);
                    jsonStream.resume();
                }
            });
            jsonStream.on('end', async () => {
                // Flush remaining items
                if (batch.length > 0) {
                    await flushBatch(batch);
                }
                console.log(`[VFS Indexer] Finished processing ${totalProcessed} files for ${remoteAlias}.`);
                resolve();
            });
            jsonStream.on('error', (err) => {
                console.error(`[VFS Indexer] Stream Parsing Error:`, err);
                reject(err);
            });
            rcloneProcess.stderr?.on('data', (data) => {
                console.warn(`[VFS Indexer rclone stderr]: ${data.toString()}`);
            });
        });
    }
    /**
     * Heartbeat to push the Dead Man's Switch forward.
     */
    async pulseHeartbeat(ttlMinutes = 5) {
        if (!this.isConnected)
            return;
        try {
            const newExpiry = new Date(Date.now() + ttlMinutes * 60000);
            await FileModel.updateMany({ workerId: this.workerId, isEphemeral: true }, { $set: { expiresAt: newExpiry } }).exec();
        }
        catch (e) {
            console.error(`[VFS Indexer] Failed to pulse heartbeat: ${e.message}`);
        }
    }
}
exports.VfsIndexerService = VfsIndexerService;

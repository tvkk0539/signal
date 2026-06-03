import { Connection, Model } from 'mongoose';
import { IVfsIndexRepository, VfsFileRecord, RcloneConfigBlock } from '../../interfaces/IVfsIndexRepository';
import { IVfsFileDocument, VfsFileSchema, IRcloneConfigDocument, RcloneConfigSchema } from './schemas/VfsIndexSchema';

export class MongoVfsIndexRepository implements IVfsIndexRepository {
  private fileModel: Model<IVfsFileDocument>;
  private configModel: Model<IRcloneConfigDocument>;

  constructor(connection: Connection) {
    this.fileModel = connection.model<IVfsFileDocument>('VfsFile', VfsFileSchema);
    this.configModel = connection.model<IRcloneConfigDocument>('RcloneConfig', RcloneConfigSchema);
  }

  async saveConfigBlock(block: RcloneConfigBlock): Promise<void> {
    await this.configModel.findOneAndUpdate(
      { alias: block.alias },
      { $set: block },
      { new: true, upsert: true }
    ).exec();
  }

  async getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]> {
    const query: any = {};
    if (isEphemeral !== undefined) query.isEphemeral = isEphemeral;
    if (workerId !== undefined) query.workerId = workerId;

    const docs = await this.configModel.find(query).lean().exec();
    return docs.map(d => ({
      alias: d.alias,
      rcloneName: d.rcloneName,
      configText: d.configText,
      isEphemeral: d.isEphemeral,
      workerId: d.workerId
    }));
  }

  async deleteConfigBlock(alias: string): Promise<void> {
    await this.configModel.deleteOne({ alias }).exec();
  }

  async bulkUpsertFiles(files: VfsFileRecord[]): Promise<void> {
    if (files.length === 0) return;

    const ops = files.map(file => ({
      updateOne: {
        filter: { remoteAlias: file.remoteAlias, path: file.path },
        update: { $set: file },
        upsert: true
      }
    }));

    // Perform highly efficient bulk write for massive streams
    await this.fileModel.bulkWrite(ops as any, { ordered: false });
  }

  async searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]> {
    const filter: any = {};
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

  async refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void> {
    const newExpiry = new Date(Date.now() + ttlMinutes * 60000);
    // Push the Dead Man's Switch forward for all ephemeral files owned by this worker
    await this.fileModel.updateMany(
      { workerId: workerId, isEphemeral: true },
      { $set: { expiresAt: newExpiry } }
    ).exec();
  }

  async purgeRemoteIndex(remoteAlias: string): Promise<void> {
    await this.fileModel.deleteMany({ remoteAlias }).exec();
  }

  async getDistinctAliases(): Promise<string[]> {
    return this.configModel.distinct('alias').exec();
  }
}

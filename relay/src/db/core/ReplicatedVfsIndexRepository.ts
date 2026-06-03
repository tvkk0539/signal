import { IVfsIndexRepository, VfsFileRecord, RcloneConfigBlock } from '../interfaces/IVfsIndexRepository';

export class ReplicatedVfsIndexRepository implements IVfsIndexRepository {
  constructor(
    private primary: IVfsIndexRepository,
    private mirrors: IVfsIndexRepository[]
  ) {}

  async saveConfigBlock(block: RcloneConfigBlock): Promise<void> {
    await this.primary.saveConfigBlock(block);
    this.mirrors.forEach(mirror => mirror.saveConfigBlock(block).catch(e => console.error('Mirror Sync Error (VFS Config):', e)));
  }

  async getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]> {
    return this.primary.getConfigBlocks(isEphemeral, workerId);
  }

  async deleteConfigBlock(alias: string): Promise<void> {
    await this.primary.deleteConfigBlock(alias);
    this.mirrors.forEach(mirror => mirror.deleteConfigBlock(alias).catch(e => console.error('Mirror Sync Error (VFS Config):', e)));
  }

  async bulkUpsertFiles(files: VfsFileRecord[]): Promise<void> {
    await this.primary.bulkUpsertFiles(files);
    // Note: Replicating massive bulk inserts to mirrors asynchronously.
    this.mirrors.forEach(mirror => mirror.bulkUpsertFiles(files).catch(e => console.error('Mirror Sync Error (VFS Bulk Insert):', e)));
  }

  async searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]> {
    // Reads always go to primary
    return this.primary.searchFiles(query, limit, remoteAlias);
  }

  async refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void> {
    await this.primary.refreshWorkerHeartbeat(workerId, ttlMinutes);
    this.mirrors.forEach(mirror => mirror.refreshWorkerHeartbeat(workerId, ttlMinutes).catch(e => {}));
  }

  async purgeRemoteIndex(remoteAlias: string): Promise<void> {
    await this.primary.purgeRemoteIndex(remoteAlias);
    this.mirrors.forEach(mirror => mirror.purgeRemoteIndex(remoteAlias).catch(e => {}));
  }
}

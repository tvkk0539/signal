import { IVfsIndexRepository, VfsFileRecord, RcloneConfigBlock } from '../../interfaces/IVfsIndexRepository';

export class InMemoryVfsIndexRepository implements IVfsIndexRepository {
  private files: Map<string, VfsFileRecord> = new Map();
  private configs: Map<string, RcloneConfigBlock> = new Map();

  async saveConfigBlock(block: RcloneConfigBlock): Promise<void> {
    this.configs.set(block.alias, block);
  }

  async getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]> {
    const results: RcloneConfigBlock[] = [];
    for (const block of this.configs.values()) {
      let match = true;
      if (isEphemeral !== undefined && block.isEphemeral !== isEphemeral) match = false;
      if (workerId !== undefined && block.workerId !== workerId) match = false;
      if (match) results.push(block);
    }
    return results;
  }

  async deleteConfigBlock(alias: string): Promise<void> {
    this.configs.delete(alias);
  }

  async bulkUpsertFiles(records: VfsFileRecord[]): Promise<void> {
    for (const file of records) {
      const key = `${file.remoteAlias}::${file.path}`;
      this.files.set(key, file);
    }
  }

  async searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]> {
    const results: VfsFileRecord[] = [];
    const lowerQuery = query.toLowerCase();

    for (const file of this.files.values()) {
      if (remoteAlias && file.remoteAlias !== remoteAlias) continue;
      if (query && !file.name.toLowerCase().includes(lowerQuery)) continue;

      results.push(file);
      if (results.length >= limit) break;
    }
    return results;
  }

  async refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void> {
    const newExpiry = new Date(Date.now() + ttlMinutes * 60000);
    for (const [key, file] of this.files.entries()) {
      if (file.workerId === workerId && file.isEphemeral) {
        file.expiresAt = newExpiry;
      }
    }
  }

  async purgeRemoteIndex(remoteAlias: string): Promise<void> {
    for (const [key, file] of this.files.entries()) {
      if (file.remoteAlias === remoteAlias) {
        this.files.delete(key);
      }
    }
  }
}

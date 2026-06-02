import { IVfsIndexRepository } from '../interfaces/IVfsIndexRepository';
import { VfsIndexItem } from '@swarm/shared';

export class ReplicatedVfsIndexRepository implements IVfsIndexRepository {
  private primary: IVfsIndexRepository;
  private mirrors: IVfsIndexRepository[];

  constructor(primary: IVfsIndexRepository, mirrors: IVfsIndexRepository[] = []) {
    this.primary = primary;
    this.mirrors = mirrors;
  }

  async upsertTree(workerId: string, remoteName: string, isPermanent: boolean, files: VfsIndexItem[], persistentId?: string): Promise<void> {
    await this.primary.upsertTree(workerId, remoteName, isPermanent, files, persistentId);
    for (const mirror of this.mirrors) {
      mirror.upsertTree(workerId, remoteName, isPermanent, files, persistentId).catch(err => {
        console.error(`[DB Mirror Error - VFS Index Upsert]:`, err);
      });
    }
  }

  async search(query: string, limit?: number): Promise<VfsIndexItem[]> {
      return this.primary.search(query, limit);
  }

  async purgeEphemeralByWorker(workerId: string): Promise<void> {
      await this.primary.purgeEphemeralByWorker(workerId);
      for (const mirror of this.mirrors) {
          mirror.purgeEphemeralByWorker(workerId).catch(err => {
            console.error(`[DB Mirror Error - VFS Index Purge]:`, err);
          });
      }
  }
}

export interface VfsFileRecord {
  id?: string;
  remoteAlias: string; // The permanent ID, decoupling from physical rclone name
  path: string;
  name: string;
  size: number;
  mimeType: string;
  modTime: Date;
  isDirectory: boolean;
  isEphemeral: boolean; // Differentiates temporary vs permanent records
  workerId?: string; // For tracking which ephemeral worker owns the TTL
  expiresAt?: Date; // TTL Dead Man's Switch
}

export interface RcloneConfigBlock {
  alias: string;
  rcloneName: string;
  configText: string;
  isEphemeral: boolean;
  workerId?: string;
}

export interface IVfsIndexRepository {
  // Config Management
  saveConfigBlock(block: RcloneConfigBlock): Promise<void>;
  getConfigBlocks(isEphemeral?: boolean, workerId?: string): Promise<RcloneConfigBlock[]>;
  deleteConfigBlock(alias: string): Promise<void>;

  // Index Management
  bulkUpsertFiles(files: VfsFileRecord[]): Promise<void>;
  searchFiles(query: string, limit: number, remoteAlias?: string): Promise<VfsFileRecord[]>;

  // TTL / Dead Man's Switch mechanics
  refreshWorkerHeartbeat(workerId: string, ttlMinutes: number): Promise<void>;

  // Manual Cleanup for Permanent/Orphaned indexes
  purgeRemoteIndex(remoteAlias: string): Promise<void>;
}

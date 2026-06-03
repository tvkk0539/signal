import { Schema, Document } from 'mongoose';

export interface IVfsFileDocument extends Document {
  remoteAlias: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  modTime: Date;
  isDirectory: boolean;
  isEphemeral: boolean;
  workerId?: string;
  expiresAt?: Date;
}

export const VfsFileSchema = new Schema<IVfsFileDocument>({
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
VfsFileSchema.index({ name: 'text', path: 'text' });
VfsFileSchema.index({ remoteAlias: 1, path: 1 }, { unique: true });

export interface IRcloneConfigDocument extends Document {
  alias: string;
  rcloneName: string;
  configText: string;
  isEphemeral: boolean;
  workerId?: string;
}

export const RcloneConfigSchema = new Schema<IRcloneConfigDocument>({
  alias: { type: String, required: true, unique: true },
  rcloneName: { type: String, required: true },
  configText: { type: String, required: true },
  isEphemeral: { type: Boolean, required: true },
  workerId: { type: String }
});

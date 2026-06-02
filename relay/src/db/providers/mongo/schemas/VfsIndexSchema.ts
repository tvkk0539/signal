import mongoose, { Schema, Document } from 'mongoose';
import { VfsIndexItem } from '@swarm/shared';

export interface IVfsIndexModel extends Document {
  id: string;
  remoteName: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  isDir: boolean;
  workerId: string;
  persistentId?: string;
  isPermanent: boolean;
  createdAt: Date;
}

const VfsIndexSchema: Schema = new Schema({
  id: { type: String, required: true },
  remoteName: { type: String, required: true },
  path: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  isDir: { type: Boolean, required: true },
  workerId: { type: String, required: true },
  persistentId: { type: String },
  isPermanent: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Text index for blazing fast lightning searches
VfsIndexSchema.index({ name: 'text', path: 'text' });
// Compound index for instant ephemeral purging
VfsIndexSchema.index({ workerId: 1, isPermanent: 1 });
// Compound index for permanent tree upserts
VfsIndexSchema.index({ persistentId: 1, id: 1 }, { unique: true, sparse: true });

export const VfsIndexModel = mongoose.model<IVfsIndexModel>('VfsIndex', VfsIndexSchema);

import { Schema, Document } from 'mongoose';
import { AppleMusicConfig } from '../../../interfaces/IAppleMusicRepository';

export interface IAppleMusicConfigDocument extends Omit<AppleMusicConfig, 'updatedAt'>, Document {
  updatedAt: Date;
}

export const AppleMusicSchema = new Schema<IAppleMusicConfigDocument>({
  mediaUserToken: { type: String, default: '' },
  storefront: { type: String, default: 'us' },
  alacFix: { type: Boolean, default: false },
  autoUpload: { type: Boolean, default: true },
  rcloneRemote: { type: String, default: 'remote:/Media/AppleMusic_Rips' },
  lrcFormat: { type: String, enum: ['lrc', 'ttml'], default: 'lrc' },
  lrcType: { type: String, enum: ['lyrics', 'syllable-lyrics'], default: 'lyrics' },
  language: { type: String, default: '' },
  tagSortOrder: { type: Boolean, default: true },
  saveLrcFile: { type: Boolean, default: false },
  saveArtistCover: { type: Boolean, default: false },
  useSongInfoForPlaylist: { type: Boolean, default: false },
  wrapperStatePayload: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: { updatedAt: 'updatedAt' }
});

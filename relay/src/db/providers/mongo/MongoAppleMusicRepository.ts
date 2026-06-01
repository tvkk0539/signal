import { Connection, Model } from 'mongoose';
import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';
import { IAppleMusicConfigDocument, AppleMusicSchema } from './schemas/AppleMusicSchema';

export class MongoAppleMusicRepository implements IAppleMusicRepository {
  private configModel: Model<IAppleMusicConfigDocument>;

  constructor(connection: Connection) {
    this.configModel = connection.model<IAppleMusicConfigDocument>('AppleMusicConfig', AppleMusicSchema);
  }

  async getConfig(): Promise<AppleMusicConfig | null> {
    // We assume a single configuration document exists for the system/user.
    // In a multi-tenant environment, you might filter by userId.
    const doc = await this.configModel.findOne().exec();
    if (!doc) return null;

    return {
      mediaUserToken: doc.mediaUserToken,
      storefront: doc.storefront,
      alacFix: doc.alacFix,
      autoUpload: doc.autoUpload,
      rcloneRemote: doc.rcloneRemote,
      lrcFormat: doc.lrcFormat,
      lrcType: doc.lrcType,
      language: doc.language,
      tagSortOrder: doc.tagSortOrder,
      saveLrcFile: doc.saveLrcFile,
      saveArtistCover: doc.saveArtistCover,
      useSongInfoForPlaylist: doc.useSongInfoForPlaylist,
      wrapperStatePayload: doc.wrapperStatePayload,
      updatedAt: doc.updatedAt
    };
  }

  async saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig> {
    const updateData = {
      ...config,
      updatedAt: new Date()
    };

    // Upsert the single configuration document
    const doc = await this.configModel.findOneAndUpdate(
      {}, // Match the first/only document
      { $set: updateData },
      { new: true, upsert: true }
    ).exec();

    return {
      mediaUserToken: doc.mediaUserToken,
      storefront: doc.storefront,
      alacFix: doc.alacFix,
      autoUpload: doc.autoUpload,
      rcloneRemote: doc.rcloneRemote,
      lrcFormat: doc.lrcFormat,
      lrcType: doc.lrcType,
      language: doc.language,
      tagSortOrder: doc.tagSortOrder,
      saveLrcFile: doc.saveLrcFile,
      saveArtistCover: doc.saveArtistCover,
      useSongInfoForPlaylist: doc.useSongInfoForPlaylist,
      wrapperStatePayload: doc.wrapperStatePayload,
      updatedAt: doc.updatedAt
    };
  }
}

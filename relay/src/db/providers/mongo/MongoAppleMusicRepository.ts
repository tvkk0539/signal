import { Connection, Model } from 'mongoose';
import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';
import { IAppleMusicConfigDocument, AppleMusicSchema, IWrapperProfileDocument, WrapperProfileSchema } from './schemas/AppleMusicSchema';

export class MongoAppleMusicRepository implements IAppleMusicRepository {
  private configModel: Model<IAppleMusicConfigDocument>;
  private profileModel: Model<IWrapperProfileDocument>;

  constructor(connection: Connection) {
    this.configModel = connection.model<IAppleMusicConfigDocument>('AppleMusicConfig', AppleMusicSchema);
    this.profileModel = connection.model<IWrapperProfileDocument>('WrapperProfile', WrapperProfileSchema);
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
      updatedAt: doc.updatedAt
    };
  }

  async saveWrapperProfile(profile: any): Promise<void> {
    await this.profileModel.findOneAndUpdate(
      { id: profile.id },
      { $set: profile },
      { new: true, upsert: true }
    ).exec();
  }

  async getWrapperProfiles(): Promise<any[]> {
    const docs = await this.profileModel.find({}, { payload: 0 }).lean().exec();
    return docs.map(doc => ({
      id: doc.id,
      name: doc.name,
      username: doc.username,
      timestamp: doc.timestamp
    }));
  }

  async getWrapperProfilePayload(profileId: string): Promise<string | null> {
    const doc = await this.profileModel.findOne({ id: profileId }, { payload: 1 }).lean().exec();
    return doc ? doc.payload : null;
  }

  async deleteWrapperProfile(profileId: string): Promise<void> {
    await this.profileModel.deleteOne({ id: profileId }).exec();
  }
}

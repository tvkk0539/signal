import { IAppleMusicRepository, AppleMusicConfig, WrapperProfileData } from '../../interfaces/IAppleMusicRepository';

export class InMemoryAppleMusicRepository implements IAppleMusicRepository {
  private config: AppleMusicConfig | null = null;
  private wrapperProfiles: Map<string, WrapperProfileData> = new Map();

  async getConfig(): Promise<AppleMusicConfig | null> {
    return this.config;
  }

  async saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig> {
    this.config = {
      mediaUserToken: config.mediaUserToken || '',
      storefront: config.storefront || 'us',
      alacFix: config.alacFix ?? false,
      autoUpload: config.autoUpload ?? true,
      rcloneRemote: config.rcloneRemote || 'remote:/Media/AppleMusic_Rips',
      lrcFormat: config.lrcFormat || 'lrc',
      lrcType: config.lrcType || 'lyrics',
      language: config.language || '',
      tagSortOrder: config.tagSortOrder ?? true,
      saveLrcFile: config.saveLrcFile ?? false,
      saveArtistCover: config.saveArtistCover ?? false,
      useSongInfoForPlaylist: config.useSongInfoForPlaylist ?? false,
      updatedAt: new Date()
    };
    return this.config;
  }

  async saveWrapperProfile(profile: WrapperProfileData): Promise<void> {
    this.wrapperProfiles.set(profile.id, profile);
  }

  async getWrapperProfiles(): Promise<Omit<WrapperProfileData, 'payload'>[]> {
    const profiles: Omit<WrapperProfileData, 'payload'>[] = [];
    for (const profile of this.wrapperProfiles.values()) {
      profiles.push({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        timestamp: profile.timestamp
      });
    }
    return profiles;
  }

  async getWrapperProfilePayload(profileId: string): Promise<string | null> {
    const profile = this.wrapperProfiles.get(profileId);
    return profile ? profile.payload : null;
  }

  async deleteWrapperProfile(profileId: string): Promise<void> {
    this.wrapperProfiles.delete(profileId);
  }
}
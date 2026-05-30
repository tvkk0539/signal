import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';

export class InMemoryAppleMusicRepository implements IAppleMusicRepository {
  private config: AppleMusicConfig | null = null;

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
}
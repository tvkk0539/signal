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
      autoUpload: config.autoUpload ?? true,
      rcloneRemote: config.rcloneRemote || 'remote:/Media/AppleMusic_Rips',
      updatedAt: new Date()
    };
    return this.config;
  }
}
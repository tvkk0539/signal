import { IAppleMusicRepository, AppleMusicConfig } from '../interfaces/IAppleMusicRepository';

export class ReplicatedAppleMusicRepository implements IAppleMusicRepository {
  constructor(
    private primary: IAppleMusicRepository,
    private mirrors: IAppleMusicRepository[]
  ) {}

  async getConfig(): Promise<AppleMusicConfig | null> {
    return this.primary.getConfig();
  }

  async saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig> {
    const result = await this.primary.saveConfig(config);
    this.mirrors.forEach(mirror => {
      mirror.saveConfig(config).catch(err => {
        console.error(`[ReplicatedAppleMusic] Mirror save failed:`, err);
      });
    });
    return result;
  }
}
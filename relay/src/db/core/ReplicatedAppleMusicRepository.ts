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

  async saveWrapperProfile(profile: any): Promise<void> {
    await this.primary.saveWrapperProfile(profile);
    this.mirrors.forEach(mirror => {
      mirror.saveWrapperProfile(profile).catch(err => {
        console.error(`[ReplicatedAppleMusic] Mirror saveWrapperProfile failed:`, err);
      });
    });
  }

  async getWrapperProfiles(): Promise<any[]> {
    return this.primary.getWrapperProfiles();
  }

  async getWrapperProfilePayload(profileId: string): Promise<string | null> {
    return this.primary.getWrapperProfilePayload(profileId);
  }

  async deleteWrapperProfile(profileId: string): Promise<void> {
    await this.primary.deleteWrapperProfile(profileId);
    this.mirrors.forEach(mirror => {
      mirror.deleteWrapperProfile(profileId).catch(err => {
        console.error(`[ReplicatedAppleMusic] Mirror deleteWrapperProfile failed:`, err);
      });
    });
  }
}
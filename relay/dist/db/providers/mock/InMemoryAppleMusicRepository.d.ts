import { IAppleMusicRepository, AppleMusicConfig, WrapperProfileData } from '../../interfaces/IAppleMusicRepository';
export declare class InMemoryAppleMusicRepository implements IAppleMusicRepository {
    private config;
    private wrapperProfiles;
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
    saveWrapperProfile(profile: WrapperProfileData): Promise<void>;
    getWrapperProfiles(): Promise<Omit<WrapperProfileData, 'payload'>[]>;
    getWrapperProfilePayload(profileId: string): Promise<string | null>;
    deleteWrapperProfile(profileId: string): Promise<void>;
}

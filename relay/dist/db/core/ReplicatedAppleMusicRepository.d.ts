import { IAppleMusicRepository, AppleMusicConfig } from '../interfaces/IAppleMusicRepository';
export declare class ReplicatedAppleMusicRepository implements IAppleMusicRepository {
    private primary;
    private mirrors;
    constructor(primary: IAppleMusicRepository, mirrors: IAppleMusicRepository[]);
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
    saveWrapperProfile(profile: any): Promise<void>;
    getWrapperProfiles(): Promise<any[]>;
    getWrapperProfilePayload(profileId: string): Promise<string | null>;
    deleteWrapperProfile(profileId: string): Promise<void>;
}

import { Connection } from 'mongoose';
import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';
export declare class MongoAppleMusicRepository implements IAppleMusicRepository {
    private configModel;
    private profileModel;
    constructor(connection: Connection);
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
    saveWrapperProfile(profile: any): Promise<void>;
    getWrapperProfiles(): Promise<any[]>;
    getWrapperProfilePayload(profileId: string): Promise<string | null>;
    deleteWrapperProfile(profileId: string): Promise<void>;
}

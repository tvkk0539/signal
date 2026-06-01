import { Connection } from 'mongoose';
import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';
export declare class MongoAppleMusicRepository implements IAppleMusicRepository {
    private configModel;
    constructor(connection: Connection);
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
}

import { IAppleMusicRepository, AppleMusicConfig } from '../../interfaces/IAppleMusicRepository';
export declare class InMemoryAppleMusicRepository implements IAppleMusicRepository {
    private config;
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
}

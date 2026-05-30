import { IAppleMusicRepository, AppleMusicConfig } from '../interfaces/IAppleMusicRepository';
export declare class ReplicatedAppleMusicRepository implements IAppleMusicRepository {
    private primary;
    private mirrors;
    constructor(primary: IAppleMusicRepository, mirrors: IAppleMusicRepository[]);
    getConfig(): Promise<AppleMusicConfig | null>;
    saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
}

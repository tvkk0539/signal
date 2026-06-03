import { Connection } from 'mongoose';
import { ISystemRoutingRepository } from '../../interfaces/ISystemRoutingRepository';
import { DomainService, DomainRoutingConfig } from '../../index';
export declare class MongoSystemRoutingRepository implements ISystemRoutingRepository {
    private routingModel;
    constructor(connection: Connection);
    getRouting(domain: DomainService): Promise<DomainRoutingConfig | null>;
    getAllRoutings(): Promise<Record<string, DomainRoutingConfig>>;
    saveRouting(domain: DomainService, config: DomainRoutingConfig): Promise<void>;
}

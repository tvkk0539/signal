import { DomainService, DomainRoutingConfig } from '../index';
export interface ISystemRoutingRepository {
    getRouting(domain: DomainService): Promise<DomainRoutingConfig | null>;
    getAllRoutings(): Promise<Record<string, DomainRoutingConfig>>;
    saveRouting(domain: DomainService, config: DomainRoutingConfig): Promise<void>;
}

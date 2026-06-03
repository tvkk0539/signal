import { Connection, Model } from 'mongoose';
import { ISystemRoutingRepository } from '../../interfaces/ISystemRoutingRepository';
import { ISystemRoutingDocument, SystemRoutingSchema } from './schemas/SystemRoutingSchema';
import { DomainService, DomainRoutingConfig } from '../../index';

export class MongoSystemRoutingRepository implements ISystemRoutingRepository {
  private routingModel: Model<ISystemRoutingDocument>;

  constructor(connection: Connection) {
    this.routingModel = connection.model<ISystemRoutingDocument>('SystemRouting', SystemRoutingSchema);
  }

  async getRouting(domain: DomainService): Promise<DomainRoutingConfig | null> {
    const doc = await this.routingModel.findOne({ domain }).lean().exec();
    if (!doc) return null;
    return {
      primary: doc.primary as any,
      mirrors: doc.mirrors as any[]
    };
  }

  async getAllRoutings(): Promise<Record<string, DomainRoutingConfig>> {
    const docs = await this.routingModel.find().lean().exec();
    const result: Record<string, DomainRoutingConfig> = {};
    for (const doc of docs) {
      result[doc.domain] = {
        primary: doc.primary as any,
        mirrors: doc.mirrors as any[]
      };
    }
    return result;
  }

  async saveRouting(domain: DomainService, config: DomainRoutingConfig): Promise<void> {
    await this.routingModel.findOneAndUpdate(
      { domain },
      {
        $set: {
          primary: config.primary,
          mirrors: config.mirrors,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    ).exec();
  }
}
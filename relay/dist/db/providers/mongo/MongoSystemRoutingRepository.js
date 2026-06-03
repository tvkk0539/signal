"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoSystemRoutingRepository = void 0;
const SystemRoutingSchema_1 = require("./schemas/SystemRoutingSchema");
class MongoSystemRoutingRepository {
    routingModel;
    constructor(connection) {
        this.routingModel = connection.model('SystemRouting', SystemRoutingSchema_1.SystemRoutingSchema);
    }
    async getRouting(domain) {
        const doc = await this.routingModel.findOne({ domain }).lean().exec();
        if (!doc)
            return null;
        return {
            primary: doc.primary,
            mirrors: doc.mirrors
        };
    }
    async getAllRoutings() {
        const docs = await this.routingModel.find().lean().exec();
        const result = {};
        for (const doc of docs) {
            result[doc.domain] = {
                primary: doc.primary,
                mirrors: doc.mirrors
            };
        }
        return result;
    }
    async saveRouting(domain, config) {
        await this.routingModel.findOneAndUpdate({ domain }, {
            $set: {
                primary: config.primary,
                mirrors: config.mirrors,
                updatedAt: new Date()
            }
        }, { new: true, upsert: true }).exec();
    }
}
exports.MongoSystemRoutingRepository = MongoSystemRoutingRepository;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectMongo = async () => {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/swarm_db';
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log(`[DB Manager] Successfully connected to MongoDB plugin.`);
    }
    catch (error) {
        console.error(`[DB Manager] Failed to connect to MongoDB plugin:`, error);
        throw error;
    }
};
exports.connectMongo = connectMongo;

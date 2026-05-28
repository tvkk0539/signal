"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMongoConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Map to hold multiple connections if different domains connect to different MongoDB clusters
const connections = new Map();
const createMongoConnection = async (connectionString) => {
    const uri = connectionString || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/swarm_commander';
    if (connections.has(uri)) {
        console.log(`[MongoDB] Using existing connection for URI: ${uri}`);
        return connections.get(uri);
    }
    console.log(`[MongoDB] Creating new Mongoose connection to: ${uri}`);
    try {
        const conn = mongoose_1.default.createConnection(uri, {
            serverSelectionTimeoutMS: 5000 // Fast fail for mock fallback
        });
        // Wait for the connection to actually be established
        await new Promise((resolve, reject) => {
            conn.once('open', resolve);
            conn.once('error', reject);
        });
        console.log(`[MongoDB] Connection Successful to ${uri}`);
        connections.set(uri, conn);
        return conn;
    }
    catch (error) {
        console.error('[MongoDB] Connection Failed:', error);
        throw error;
    }
};
exports.createMongoConnection = createMongoConnection;

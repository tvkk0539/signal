"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbManager = void 0;
const MongoUserRepository_1 = require("./providers/mongo/MongoUserRepository");
const MongoAuditLogRepository_1 = require("./providers/mongo/MongoAuditLogRepository");
const InMemoryUserRepository_1 = require("./providers/mock/InMemoryUserRepository");
const InMemoryAuditLogRepository_1 = require("./providers/mock/InMemoryAuditLogRepository");
const connection_1 = require("./providers/mongo/connection");
class DatabaseManager {
    userRepository;
    auditLogRepository;
    async initialize() {
        const dbType = process.env.DB_TYPE || 'MONGODB';
        console.log(`[DB Manager] Initializing with Plugin: ${dbType}`);
        if (dbType === 'MONGODB') {
            try {
                await (0, connection_1.connectMongo)();
                this.userRepository = new MongoUserRepository_1.MongoUserRepository();
                this.auditLogRepository = new MongoAuditLogRepository_1.MongoAuditLogRepository();
            }
            catch (err) {
                console.warn(`[DB Manager] MongoDB connection failed. Falling back to InMemoryMockDB for sandbox development.`);
                this.userRepository = new InMemoryUserRepository_1.InMemoryUserRepository();
                this.auditLogRepository = new InMemoryAuditLogRepository_1.InMemoryAuditLogRepository();
            }
        }
        else if (dbType === 'POSTGRES') {
            // Future Plugin Implementation
            throw new Error("Postgres Plugin not yet implemented.");
        }
        else {
            throw new Error(`Unsupported DB_TYPE: ${dbType}`);
        }
    }
    getUsers() {
        if (!this.userRepository) {
            throw new Error("DatabaseManager has not been initialized. Call initialize() first.");
        }
        return this.userRepository;
    }
    getAuditLogs() {
        if (!this.auditLogRepository) {
            throw new Error("DatabaseManager has not been initialized. Call initialize() first.");
        }
        return this.auditLogRepository;
    }
}
// Export a singleton instance
exports.dbManager = new DatabaseManager();

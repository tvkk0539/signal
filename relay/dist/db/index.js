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
    chatRepository;
    // The state map to track which engine is running which domain
    currentRouting = {
        AUTH: { engine: 'MOCK' },
        AUDIT: { engine: 'MOCK' },
        CHAT: { engine: 'MOCK' }
    };
    async initialize() {
        console.log(`[DB Manager] Initializing Polyglot Switchboard...`);
        // On first boot, we default to MONGODB if requested via env, else MOCK
        const defaultEngine = process.env.DB_TYPE || 'MONGODB';
        try {
            await this.hotSwapDomain('AUTH', { engine: defaultEngine });
            await this.hotSwapDomain('AUDIT', { engine: defaultEngine });
            await this.hotSwapDomain('CHAT', { engine: defaultEngine });
        }
        catch (e) {
            console.warn(`[DB Manager] Primary initialize failed, falling back to MOCK universally.`);
            await this.hotSwapDomain('AUTH', { engine: 'MOCK' });
            await this.hotSwapDomain('AUDIT', { engine: 'MOCK' });
            await this.hotSwapDomain('CHAT', { engine: 'MOCK' });
        }
    }
    // The Magic Function: Hot-Swaps a specific domain's database engine at runtime
    async hotSwapDomain(domain, config) {
        console.log(`[DB Manager] Hot-swapping ${domain} domain to ${config.engine}...`);
        try {
            switch (domain) {
                case 'AUTH':
                    this.userRepository = await this.instantiateUserRepository(config);
                    break;
                case 'AUDIT':
                    this.auditLogRepository = await this.instantiateAuditRepository(config);
                    break;
                case 'CHAT':
                    this.chatRepository = await this.instantiateChatRepository(config);
                    break;
            }
            this.currentRouting[domain] = config;
            console.log(`[DB Manager] Successfully routed ${domain} to ${config.engine}.`);
        }
        catch (err) {
            console.error(`[DB Manager] Failed to hot-swap ${domain} to ${config.engine}: ${err.message}`);
            // Fallback to mock if it completely fails to avoid crashing the server
            if (config.engine !== 'MOCK') {
                console.log(`[DB Manager] Falling back ${domain} to MOCK.`);
                await this.hotSwapDomain(domain, { engine: 'MOCK' });
            }
            throw err; // Re-throw so the UI knows the connection failed
        }
    }
    getRoutingState() {
        // Redact sensitive connection strings and API keys before broadcasting to UI
        const safeRouting = {};
        for (const [domain, config] of Object.entries(this.currentRouting)) {
            safeRouting[domain] = { engine: config.engine };
        }
        return safeRouting;
    }
    // --- Adapter Factories ---
    async instantiateUserRepository(config) {
        if (config.engine === 'MONGODB') {
            const conn = await (0, connection_1.createMongoConnection)(config.connectionString);
            return new MongoUserRepository_1.MongoUserRepository(conn);
        }
        if (config.engine === 'MOCK')
            return new InMemoryUserRepository_1.InMemoryUserRepository();
        if (config.engine === 'POSTGRES') {
            const { PostgresUserRepository } = await import('./providers/postgres/PostgresUserRepository.js');
            return new PostgresUserRepository(config.connectionString);
        }
        throw new Error(`${config.engine} User Adapter not fully implemented yet.`);
    }
    async instantiateAuditRepository(config) {
        if (config.engine === 'MONGODB') {
            const conn = await (0, connection_1.createMongoConnection)(config.connectionString);
            return new MongoAuditLogRepository_1.MongoAuditLogRepository(conn);
        }
        if (config.engine === 'MOCK')
            return new InMemoryAuditLogRepository_1.InMemoryAuditLogRepository();
        if (config.engine === 'POSTGRES') {
            const { PostgresAuditLogRepository } = await import('./providers/postgres/PostgresAuditLogRepository.js');
            return new PostgresAuditLogRepository(config.connectionString);
        }
        throw new Error(`${config.engine} Audit Adapter not fully implemented yet.`);
    }
    async instantiateChatRepository(config) {
        if (config.engine === 'MONGODB') {
            const conn = await (0, connection_1.createMongoConnection)(config.connectionString);
            // return new MongoChatRepository(conn); // Note: Needs implementation
            return new MockChatRepository(); // Temporary fallback
        }
        if (config.engine === 'MOCK')
            return new MockChatRepository();
        if (config.engine === 'POSTGRES') {
            const { PostgresChatRepository } = await import('./providers/postgres/PostgresChatRepository.js');
            return new PostgresChatRepository(config.connectionString);
        }
        throw new Error(`${config.engine} Chat Adapter not fully implemented yet.`);
    }
    // --- Accessors ---
    getUsers() {
        if (!this.userRepository)
            throw new Error("DatabaseManager Auth not initialized.");
        return this.userRepository;
    }
    getAuditLogs() {
        if (!this.auditLogRepository)
            throw new Error("DatabaseManager Audit not initialized.");
        return this.auditLogRepository;
    }
    getChat() {
        if (!this.chatRepository)
            throw new Error("DatabaseManager Chat not initialized.");
        return this.chatRepository;
    }
}
// Temporary Mock Chat Repository until MongoChatRepository is built
class MockChatRepository {
    messages = [];
    async saveMessage(msg) { this.messages.push(msg); }
    async getMessages() { return this.messages; }
}
// Export a singleton instance
exports.dbManager = new DatabaseManager();

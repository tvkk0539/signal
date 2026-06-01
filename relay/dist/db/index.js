"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbManager = void 0;
const MongoUserRepository_1 = require("./providers/mongo/MongoUserRepository");
const MongoAuditLogRepository_1 = require("./providers/mongo/MongoAuditLogRepository");
const InMemoryUserRepository_1 = require("./providers/mock/InMemoryUserRepository");
const InMemoryAuditLogRepository_1 = require("./providers/mock/InMemoryAuditLogRepository");
const InMemoryAppleMusicRepository_1 = require("./providers/mock/InMemoryAppleMusicRepository");
const MongoAppleMusicRepository_1 = require("./providers/mongo/MongoAppleMusicRepository");
const connection_1 = require("./providers/mongo/connection");
const ReplicatedUserRepository_1 = require("./core/ReplicatedUserRepository");
const ReplicatedAuditLogRepository_1 = require("./core/ReplicatedAuditLogRepository");
const ReplicatedChatRepository_1 = require("./core/ReplicatedChatRepository");
const ReplicatedAppleMusicRepository_1 = require("./core/ReplicatedAppleMusicRepository");
class DatabaseManager {
    userRepository;
    auditLogRepository;
    chatRepository;
    appleMusicRepository;
    // The state map to track which engines are running which domain (Primary + Mirrors)
    currentRouting = {
        AUTH: { primary: { engine: 'MOCK' }, mirrors: [] },
        AUDIT: { primary: { engine: 'MOCK' }, mirrors: [] },
        CHAT: { primary: { engine: 'MOCK' }, mirrors: [] },
        APPLE_MUSIC: { primary: { engine: 'MOCK' }, mirrors: [] }
    };
    async initialize() {
        console.log(`[DB Manager] Initializing Polyglot Switchboard...`);
        // On first boot, we default to MONGODB if requested via env, else MOCK
        const defaultEngine = process.env.DB_TYPE || 'MONGODB';
        try {
            await this.hotSwapDomain('AUTH', { primary: { engine: defaultEngine }, mirrors: [] });
            await this.hotSwapDomain('AUDIT', { primary: { engine: defaultEngine }, mirrors: [] });
            await this.hotSwapDomain('CHAT', { primary: { engine: defaultEngine }, mirrors: [] });
            await this.hotSwapDomain('APPLE_MUSIC', { primary: { engine: defaultEngine }, mirrors: [] });
        }
        catch (e) {
            console.warn(`[DB Manager] Primary initialize failed, falling back to MOCK universally.`);
            await this.hotSwapDomain('AUTH', { primary: { engine: 'MOCK' }, mirrors: [] });
            await this.hotSwapDomain('AUDIT', { primary: { engine: 'MOCK' }, mirrors: [] });
            await this.hotSwapDomain('CHAT', { primary: { engine: 'MOCK' }, mirrors: [] });
            await this.hotSwapDomain('APPLE_MUSIC', { primary: { engine: 'MOCK' }, mirrors: [] });
        }
    }
    // The Magic Function: Hot-Swaps a specific domain's database engine (and its mirrors) at runtime
    async hotSwapDomain(domain, config) {
        console.log(`[DB Manager] Hot-swapping ${domain} domain to Primary: ${config.primary.engine} with ${config.mirrors.length} mirrors...`);
        try {
            // 1. Instantiate the Primary
            const primaryRepo = await this.instantiateDomainRepository(domain, config.primary);
            // 2. Instantiate all Mirrors
            const mirrorRepos = [];
            for (const mirrorConfig of config.mirrors) {
                try {
                    mirrorRepos.push(await this.instantiateDomainRepository(domain, mirrorConfig));
                }
                catch (mirrorErr) {
                    console.error(`[DB Manager] Failed to instantiate mirror ${mirrorConfig.engine} for ${domain}: ${mirrorErr.message}`);
                    // We don't throw here; we let the primary continue working even if a mirror is offline.
                }
            }
            // 3. Wrap them in the Replication Engine and hot-swap the live pointer
            switch (domain) {
                case 'AUTH':
                    this.userRepository = new ReplicatedUserRepository_1.ReplicatedUserRepository(primaryRepo, mirrorRepos);
                    break;
                case 'AUDIT':
                    this.auditLogRepository = new ReplicatedAuditLogRepository_1.ReplicatedAuditLogRepository(primaryRepo, mirrorRepos);
                    break;
                case 'CHAT':
                    this.chatRepository = new ReplicatedChatRepository_1.ReplicatedChatRepository(primaryRepo, mirrorRepos);
                    break;
                case 'APPLE_MUSIC':
                    this.appleMusicRepository = new ReplicatedAppleMusicRepository_1.ReplicatedAppleMusicRepository(primaryRepo, mirrorRepos);
                    break;
            }
            this.currentRouting[domain] = config;
            console.log(`[DB Manager] Successfully routed ${domain} to Replication Engine (Primary: ${config.primary.engine}, Mirrors: ${mirrorRepos.length}).`);
        }
        catch (err) {
            console.error(`[DB Manager] Failed to hot-swap Primary ${domain} to ${config.primary.engine}: ${err.message}`);
            // Fallback to mock if it completely fails to avoid crashing the server
            if (config.primary.engine !== 'MOCK') {
                console.log(`[DB Manager] Falling back ${domain} to MOCK.`);
                await this.hotSwapDomain(domain, { primary: { engine: 'MOCK' }, mirrors: [] });
            }
            throw err; // Re-throw so the UI knows the connection failed
        }
    }
    getRoutingState() {
        // Redact sensitive connection strings and API keys before broadcasting to UI
        const safeRouting = {};
        for (const [domain, config] of Object.entries(this.currentRouting)) {
            safeRouting[domain] = {
                primary: { engine: config.primary.engine },
                mirrors: config.mirrors.map(m => ({ engine: m.engine }))
            };
        }
        return safeRouting;
    }
    // --- Dynamic Instantiator Router ---
    async instantiateDomainRepository(domain, config) {
        switch (domain) {
            case 'AUTH': return this.instantiateUserRepository(config);
            case 'AUDIT': return this.instantiateAuditRepository(config);
            case 'CHAT': return this.instantiateChatRepository(config);
            case 'APPLE_MUSIC': return this.instantiateAppleMusicRepository(config);
        }
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
    async instantiateAppleMusicRepository(config) {
        if (config.engine === 'MONGODB') {
            const conn = await (0, connection_1.createMongoConnection)(config.connectionString);
            return new MongoAppleMusicRepository_1.MongoAppleMusicRepository(conn);
        }
        if (config.engine === 'MOCK')
            return new InMemoryAppleMusicRepository_1.InMemoryAppleMusicRepository();
        // if (config.engine === 'POSTGRES') return new PostgresAppleMusicRepository(config.connectionString); // Future addition
        throw new Error(`${config.engine} Apple Music Adapter not fully implemented yet.`);
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
    getAppleMusic() {
        if (!this.appleMusicRepository)
            throw new Error("DatabaseManager Apple Music not initialized.");
        return this.appleMusicRepository;
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

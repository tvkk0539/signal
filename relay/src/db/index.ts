import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { IChatRepository } from './interfaces/IChatRepository';

import { MongoUserRepository } from './providers/mongo/MongoUserRepository';
import { MongoAuditLogRepository } from './providers/mongo/MongoAuditLogRepository';
import { InMemoryUserRepository } from './providers/mock/InMemoryUserRepository';
import { InMemoryAuditLogRepository } from './providers/mock/InMemoryAuditLogRepository';
import { createMongoConnection } from './providers/mongo/connection';

export type DatabaseEngine = 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
export type DomainService = 'AUTH' | 'AUDIT' | 'CHAT';

export interface DatabaseConfig {
  engine: DatabaseEngine;
  connectionString?: string;
  apiKey?: string;
}

class DatabaseManager {
  private userRepository!: IUserRepository;
  private auditLogRepository!: IAuditLogRepository;
  private chatRepository!: IChatRepository;

  // The state map to track which engine is running which domain
  private currentRouting: Record<DomainService, DatabaseConfig> = {
    AUTH: { engine: 'MOCK' },
    AUDIT: { engine: 'MOCK' },
    CHAT: { engine: 'MOCK' }
  };

  async initialize() {
    console.log(`[DB Manager] Initializing Polyglot Switchboard...`);
    // On first boot, we default to MONGODB if requested via env, else MOCK
    const defaultEngine = (process.env.DB_TYPE as DatabaseEngine) || 'MONGODB';

    try {
       await this.hotSwapDomain('AUTH', { engine: defaultEngine });
       await this.hotSwapDomain('AUDIT', { engine: defaultEngine });
       await this.hotSwapDomain('CHAT', { engine: defaultEngine });
    } catch (e) {
       console.warn(`[DB Manager] Primary initialize failed, falling back to MOCK universally.`);
       await this.hotSwapDomain('AUTH', { engine: 'MOCK' });
       await this.hotSwapDomain('AUDIT', { engine: 'MOCK' });
       await this.hotSwapDomain('CHAT', { engine: 'MOCK' });
    }
  }

  // The Magic Function: Hot-Swaps a specific domain's database engine at runtime
  async hotSwapDomain(domain: DomainService, config: DatabaseConfig) {
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
    } catch (err: any) {
       console.error(`[DB Manager] Failed to hot-swap ${domain} to ${config.engine}: ${err.message}`);
       // Fallback to mock if it completely fails to avoid crashing the server
       if (config.engine !== 'MOCK') {
          console.log(`[DB Manager] Falling back ${domain} to MOCK.`);
          await this.hotSwapDomain(domain, { engine: 'MOCK' });
       }
       throw err; // Re-throw so the UI knows the connection failed
    }
  }

  public getRoutingState() {
     // Redact sensitive connection strings and API keys before broadcasting to UI
     const safeRouting: Record<string, { engine: string }> = {};
     for (const [domain, config] of Object.entries(this.currentRouting)) {
        safeRouting[domain] = { engine: config.engine };
     }
     return safeRouting;
  }

  // --- Adapter Factories ---

  private async instantiateUserRepository(config: DatabaseConfig): Promise<IUserRepository> {
    if (config.engine === 'MONGODB') {
       const conn = await createMongoConnection(config.connectionString);
       return new MongoUserRepository(conn);
    }
    if (config.engine === 'MOCK') return new InMemoryUserRepository();
    if (config.engine === 'POSTGRES') {
       const { PostgresUserRepository } = await import('./providers/postgres/PostgresUserRepository.js');
       return new PostgresUserRepository(config.connectionString);
    }

    throw new Error(`${config.engine} User Adapter not fully implemented yet.`);
  }

  private async instantiateAuditRepository(config: DatabaseConfig): Promise<IAuditLogRepository> {
    if (config.engine === 'MONGODB') {
       const conn = await createMongoConnection(config.connectionString);
       return new MongoAuditLogRepository(conn);
    }
    if (config.engine === 'MOCK') return new InMemoryAuditLogRepository();
    if (config.engine === 'POSTGRES') {
       const { PostgresAuditLogRepository } = await import('./providers/postgres/PostgresAuditLogRepository.js');
       return new PostgresAuditLogRepository(config.connectionString);
    }

    throw new Error(`${config.engine} Audit Adapter not fully implemented yet.`);
  }

  private async instantiateChatRepository(config: DatabaseConfig): Promise<IChatRepository> {
    if (config.engine === 'MONGODB') {
       const conn = await createMongoConnection(config.connectionString);
       // return new MongoChatRepository(conn); // Note: Needs implementation
       return new MockChatRepository(); // Temporary fallback
    }
    if (config.engine === 'MOCK') return new MockChatRepository();
    if (config.engine === 'POSTGRES') {
       const { PostgresChatRepository } = await import('./providers/postgres/PostgresChatRepository.js');
       return new PostgresChatRepository(config.connectionString);
    }

    throw new Error(`${config.engine} Chat Adapter not fully implemented yet.`);
  }

  // --- Accessors ---

  getUsers(): IUserRepository {
    if (!this.userRepository) throw new Error("DatabaseManager Auth not initialized.");
    return this.userRepository;
  }

  getAuditLogs(): IAuditLogRepository {
    if (!this.auditLogRepository) throw new Error("DatabaseManager Audit not initialized.");
    return this.auditLogRepository;
  }

  getChat(): IChatRepository {
    if (!this.chatRepository) throw new Error("DatabaseManager Chat not initialized.");
    return this.chatRepository;
  }
}

// Temporary Mock Chat Repository until MongoChatRepository is built
class MockChatRepository implements IChatRepository {
  private messages: any[] = [];
  async saveMessage(msg: any): Promise<void> { this.messages.push(msg); }
  async getMessages(): Promise<any[]> { return this.messages; }
}

// Export a singleton instance
export const dbManager = new DatabaseManager();
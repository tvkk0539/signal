import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { IChatRepository } from './interfaces/IChatRepository';

import { MongoUserRepository } from './providers/mongo/MongoUserRepository';
import { MongoAuditLogRepository } from './providers/mongo/MongoAuditLogRepository';
import { InMemoryUserRepository } from './providers/mock/InMemoryUserRepository';
import { InMemoryAuditLogRepository } from './providers/mock/InMemoryAuditLogRepository';
import { InMemoryAppleMusicRepository } from './providers/mock/InMemoryAppleMusicRepository';
import { createMongoConnection } from './providers/mongo/connection';

import { ReplicatedUserRepository } from './core/ReplicatedUserRepository';
import { ReplicatedAuditLogRepository } from './core/ReplicatedAuditLogRepository';
import { ReplicatedChatRepository } from './core/ReplicatedChatRepository';
import { ReplicatedAppleMusicRepository } from './core/ReplicatedAppleMusicRepository';
import { IAppleMusicRepository } from './interfaces/IAppleMusicRepository';

export type DatabaseEngine = 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
export type DomainService = 'AUTH' | 'AUDIT' | 'CHAT' | 'APPLE_MUSIC';

export interface DatabaseConfig {
  engine: DatabaseEngine;
  connectionString?: string;
  apiKey?: string;
  isMirror?: boolean;
}

export interface DomainRoutingConfig {
  primary: DatabaseConfig;
  mirrors: DatabaseConfig[];
}

class DatabaseManager {
  private userRepository!: IUserRepository;
  private auditLogRepository!: IAuditLogRepository;
  private chatRepository!: IChatRepository;
  private appleMusicRepository!: IAppleMusicRepository;

  // The state map to track which engines are running which domain (Primary + Mirrors)
  private currentRouting: Record<DomainService, DomainRoutingConfig> = {
    AUTH: { primary: { engine: 'MOCK' }, mirrors: [] },
    AUDIT: { primary: { engine: 'MOCK' }, mirrors: [] },
    CHAT: { primary: { engine: 'MOCK' }, mirrors: [] },
    APPLE_MUSIC: { primary: { engine: 'MOCK' }, mirrors: [] }
  };

  async initialize() {
    console.log(`[DB Manager] Initializing Polyglot Switchboard...`);
    // On first boot, we default to MONGODB if requested via env, else MOCK
    const defaultEngine = (process.env.DB_TYPE as DatabaseEngine) || 'MONGODB';

    try {
       await this.hotSwapDomain('AUTH', { primary: { engine: defaultEngine }, mirrors: [] });
       await this.hotSwapDomain('AUDIT', { primary: { engine: defaultEngine }, mirrors: [] });
       await this.hotSwapDomain('CHAT', { primary: { engine: defaultEngine }, mirrors: [] });
       await this.hotSwapDomain('APPLE_MUSIC', { primary: { engine: 'MOCK' }, mirrors: [] }); // Mock default until Mongo schema is written
    } catch (e) {
       console.warn(`[DB Manager] Primary initialize failed, falling back to MOCK universally.`);
       await this.hotSwapDomain('AUTH', { primary: { engine: 'MOCK' }, mirrors: [] });
       await this.hotSwapDomain('AUDIT', { primary: { engine: 'MOCK' }, mirrors: [] });
       await this.hotSwapDomain('CHAT', { primary: { engine: 'MOCK' }, mirrors: [] });
    }
  }

  // The Magic Function: Hot-Swaps a specific domain's database engine (and its mirrors) at runtime
  async hotSwapDomain(domain: DomainService, config: DomainRoutingConfig) {
    console.log(`[DB Manager] Hot-swapping ${domain} domain to Primary: ${config.primary.engine} with ${config.mirrors.length} mirrors...`);

    if (domain === 'APPLE_MUSIC') {
       const primaryAdapter = new InMemoryAppleMusicRepository();
       const mirrorAdapters = config.mirrors.map(() => new InMemoryAppleMusicRepository());
       this.appleMusicRepository = new ReplicatedAppleMusicRepository(primaryAdapter, mirrorAdapters);
       this.currentRouting.APPLE_MUSIC = config;
       return;
    }

    try {
      // 1. Instantiate the Primary
      const primaryRepo = await this.instantiateDomainRepository(domain, config.primary);

      // 2. Instantiate all Mirrors
      const mirrorRepos = [];
      for (const mirrorConfig of config.mirrors) {
        try {
          mirrorRepos.push(await this.instantiateDomainRepository(domain, mirrorConfig));
        } catch (mirrorErr: any) {
          console.error(`[DB Manager] Failed to instantiate mirror ${mirrorConfig.engine} for ${domain}: ${mirrorErr.message}`);
          // We don't throw here; we let the primary continue working even if a mirror is offline.
        }
      }

      // 3. Wrap them in the Replication Engine and hot-swap the live pointer
      switch (domain) {
        case 'AUTH':
          this.userRepository = new ReplicatedUserRepository(primaryRepo as IUserRepository, mirrorRepos as IUserRepository[]);
          break;
        case 'AUDIT':
          this.auditLogRepository = new ReplicatedAuditLogRepository(primaryRepo as IAuditLogRepository, mirrorRepos as IAuditLogRepository[]);
          break;
        case 'CHAT':
          this.chatRepository = new ReplicatedChatRepository(primaryRepo as IChatRepository, mirrorRepos as IChatRepository[]);
          break;
      }

      this.currentRouting[domain] = config;
      console.log(`[DB Manager] Successfully routed ${domain} to Replication Engine (Primary: ${config.primary.engine}, Mirrors: ${mirrorRepos.length}).`);
    } catch (err: any) {
       console.error(`[DB Manager] Failed to hot-swap Primary ${domain} to ${config.primary.engine}: ${err.message}`);
       // Fallback to mock if it completely fails to avoid crashing the server
       if (config.primary.engine !== 'MOCK') {
          console.log(`[DB Manager] Falling back ${domain} to MOCK.`);
          await this.hotSwapDomain(domain, { primary: { engine: 'MOCK' }, mirrors: [] });
       }
       throw err; // Re-throw so the UI knows the connection failed
    }
  }

  public getRoutingState() {
     // Redact sensitive connection strings and API keys before broadcasting to UI
     const safeRouting: Record<string, { primary: { engine: string }, mirrors: { engine: string }[] }> = {};
     for (const [domain, config] of Object.entries(this.currentRouting)) {
        safeRouting[domain] = {
          primary: { engine: config.primary.engine },
          mirrors: config.mirrors.map(m => ({ engine: m.engine }))
        };
     }
     return safeRouting;
  }

  // --- Dynamic Instantiator Router ---

  private async instantiateDomainRepository(domain: DomainService, config: DatabaseConfig): Promise<any> {
    switch (domain) {
      case 'AUTH': return this.instantiateUserRepository(config);
      case 'AUDIT': return this.instantiateAuditRepository(config);
      case 'CHAT': return this.instantiateChatRepository(config);
    }
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

  public getAppleMusic() {
    if (!this.appleMusicRepository) throw new Error("DatabaseManager Apple Music not initialized.");
    return this.appleMusicRepository;
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
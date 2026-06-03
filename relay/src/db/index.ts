import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { IChatRepository } from './interfaces/IChatRepository';

import { MongoUserRepository } from './providers/mongo/MongoUserRepository';
import { MongoAuditLogRepository } from './providers/mongo/MongoAuditLogRepository';
import { InMemoryUserRepository } from './providers/mock/InMemoryUserRepository';
import { InMemoryAuditLogRepository } from './providers/mock/InMemoryAuditLogRepository';
import { InMemoryAppleMusicRepository } from './providers/mock/InMemoryAppleMusicRepository';
import { MongoAppleMusicRepository } from './providers/mongo/MongoAppleMusicRepository';
import { createMongoConnection } from './providers/mongo/connection';

import { ReplicatedUserRepository } from './core/ReplicatedUserRepository';
import { ReplicatedAuditLogRepository } from './core/ReplicatedAuditLogRepository';
import { ReplicatedChatRepository } from './core/ReplicatedChatRepository';
import { ReplicatedAppleMusicRepository } from './core/ReplicatedAppleMusicRepository';
import { IAppleMusicRepository } from './interfaces/IAppleMusicRepository';
import { IVfsIndexRepository } from './interfaces/IVfsIndexRepository';
import { ReplicatedVfsIndexRepository } from './core/ReplicatedVfsIndexRepository';
import { MongoVfsIndexRepository } from './providers/mongo/MongoVfsIndexRepository';
import { InMemoryVfsIndexRepository } from './providers/mock/InMemoryVfsIndexRepository';
import { MongoSystemRoutingRepository } from './providers/mongo/MongoSystemRoutingRepository';
import { ISystemRoutingRepository } from './interfaces/ISystemRoutingRepository';

export type DatabaseEngine = 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
export type DomainService = 'AUTH' | 'AUDIT' | 'CHAT' | 'APPLE_MUSIC' | 'VFS_PERMANENT' | 'VFS_EPHEMERAL';

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
  private vfsPermanentRepository!: IVfsIndexRepository;
  private vfsEphemeralRepository!: IVfsIndexRepository;
  private systemRoutingRepository!: ISystemRoutingRepository;

  // The state map to track which engines are running which domain (Primary + Mirrors)
  private currentRouting: Record<DomainService, DomainRoutingConfig> = {
    AUTH: { primary: { engine: 'MOCK' }, mirrors: [] },
    AUDIT: { primary: { engine: 'MOCK' }, mirrors: [] },
    CHAT: { primary: { engine: 'MOCK' }, mirrors: [] },
    APPLE_MUSIC: { primary: { engine: 'MOCK' }, mirrors: [] },
    VFS_PERMANENT: { primary: { engine: 'MOCK' }, mirrors: [] },
    VFS_EPHEMERAL: { primary: { engine: 'MOCK' }, mirrors: [] }
  };

  async initialize() {
    console.log(`[DB Manager] Initializing Polyglot Switchboard...`);
    // On first boot, we default to MONGODB if requested via env, else MOCK
    const defaultEngine = (process.env.DB_TYPE as DatabaseEngine) || 'MONGODB';

    let coreConnection;
    let savedRoutings: Record<string, DomainRoutingConfig> = {};

    try {
       console.log(`[DB Manager] Attempting to connect to Core DB...`);
       coreConnection = await createMongoConnection();
       this.systemRoutingRepository = new MongoSystemRoutingRepository(coreConnection);
       savedRoutings = await this.systemRoutingRepository.getAllRoutings();
       console.log(`[DB Manager] Successfully loaded ${Object.keys(savedRoutings).length} saved domain routings from Core DB.`);
    } catch (e) {
       console.error(`[DB Manager] Failed to connect to Core DB. Persistence for Switchboard disabled.`);
    }

    const domains: DomainService[] = ['AUTH', 'AUDIT', 'CHAT', 'APPLE_MUSIC', 'VFS_PERMANENT', 'VFS_EPHEMERAL'];

    try {
       for (const domain of domains) {
          if (savedRoutings[domain]) {
             console.log(`[DB Manager] Rehydrating saved routing for ${domain}...`);
             await this.hotSwapDomain(domain, savedRoutings[domain], false); // Don't re-save on boot
          } else {
             await this.hotSwapDomain(domain, { primary: { engine: defaultEngine }, mirrors: [] }, false);
          }
       }
    } catch (e) {
       console.warn(`[DB Manager] Primary initialize failed, falling back to MOCK universally.`);
       for (const domain of domains) {
          try {
             await this.hotSwapDomain(domain, { primary: { engine: 'MOCK' }, mirrors: [] }, false);
          } catch (mockErr) {
             console.error(`[DB Manager] FATAL: Failed to even initialize MOCK fallback for ${domain}`);
          }
       }
    }
  }

  // The Magic Function: Hot-Swaps a specific domain's database engine (and its mirrors) at runtime
  async hotSwapDomain(domain: DomainService, config: DomainRoutingConfig, saveToCore: boolean = true) {
    console.log(`[DB Manager] Hot-swapping ${domain} domain to Primary: ${config.primary.engine} with ${config.mirrors.length} mirrors...`);

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
        case 'APPLE_MUSIC':
          this.appleMusicRepository = new ReplicatedAppleMusicRepository(primaryRepo as IAppleMusicRepository, mirrorRepos as IAppleMusicRepository[]);
          break;
        case 'VFS_PERMANENT':
          this.vfsPermanentRepository = new ReplicatedVfsIndexRepository(primaryRepo as IVfsIndexRepository, mirrorRepos as IVfsIndexRepository[]);
          break;
        case 'VFS_EPHEMERAL':
          this.vfsEphemeralRepository = new ReplicatedVfsIndexRepository(primaryRepo as IVfsIndexRepository, mirrorRepos as IVfsIndexRepository[]);
          break;
      }

      this.currentRouting[domain] = config;

      // Master Control Plane: Permanently freeze this routing choice into the Core DB
      if (saveToCore && this.systemRoutingRepository) {
          try {
             await this.systemRoutingRepository.saveRouting(domain, config);
             console.log(`[DB Manager] Safely committed ${domain} routing configuration to Core DB.`);
          } catch (saveErr: any) {
             console.error(`[DB Manager] Warning: Failed to save ${domain} routing to Core DB: ${saveErr.message}`);
          }
      }

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
      case 'APPLE_MUSIC': return this.instantiateAppleMusicRepository(config);
      case 'VFS_PERMANENT':
      case 'VFS_EPHEMERAL': return this.instantiateVfsIndexRepository(config);
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

  private async instantiateAppleMusicRepository(config: DatabaseConfig): Promise<IAppleMusicRepository> {
    if (config.engine === 'MONGODB') {
       const conn = await createMongoConnection(config.connectionString);
       return new MongoAppleMusicRepository(conn);
    }
    if (config.engine === 'MOCK') return new InMemoryAppleMusicRepository();
    // if (config.engine === 'POSTGRES') return new PostgresAppleMusicRepository(config.connectionString); // Future addition

    throw new Error(`${config.engine} Apple Music Adapter not fully implemented yet.`);
  }

  private async instantiateVfsIndexRepository(config: DatabaseConfig): Promise<IVfsIndexRepository> {
    if (config.engine === 'MONGODB') {
       const { createMongoConnection } = await import('./providers/mongo/connection.js');
       const conn = await createMongoConnection(config.connectionString);
       return new MongoVfsIndexRepository(conn);
    }
    if (config.engine === 'MOCK') return new InMemoryVfsIndexRepository();

    throw new Error(`${config.engine} VFS Index Adapter not fully implemented yet.`);
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

  public getVfsPermanent(): IVfsIndexRepository {
    if (!this.vfsPermanentRepository) throw new Error("DatabaseManager VFS Permanent not initialized.");
    return this.vfsPermanentRepository;
  }

  public getVfsEphemeral(): IVfsIndexRepository {
    if (!this.vfsEphemeralRepository) throw new Error("DatabaseManager VFS Ephemeral not initialized.");
    return this.vfsEphemeralRepository;
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
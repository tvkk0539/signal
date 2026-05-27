import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { MongoUserRepository } from './providers/mongo/MongoUserRepository';
import { MongoAuditLogRepository } from './providers/mongo/MongoAuditLogRepository';
import { InMemoryUserRepository } from './providers/mock/InMemoryUserRepository';
import { InMemoryAuditLogRepository } from './providers/mock/InMemoryAuditLogRepository';
import { connectMongo } from './providers/mongo/connection';

class DatabaseManager {
  private userRepository!: IUserRepository;
  private auditLogRepository!: IAuditLogRepository;

  async initialize() {
    const dbType = process.env.DB_TYPE || 'MONGODB';

    console.log(`[DB Manager] Initializing with Plugin: ${dbType}`);

    if (dbType === 'MONGODB') {
      try {
        await connectMongo();
        this.userRepository = new MongoUserRepository();
        this.auditLogRepository = new MongoAuditLogRepository();
      } catch (err) {
        console.warn(`[DB Manager] MongoDB connection failed. Falling back to InMemoryMockDB for sandbox development.`);
        this.userRepository = new InMemoryUserRepository();
        this.auditLogRepository = new InMemoryAuditLogRepository();
      }
    } else if (dbType === 'POSTGRES') {
      // Future Plugin Implementation
      throw new Error("Postgres Plugin not yet implemented.");
    } else {
      throw new Error(`Unsupported DB_TYPE: ${dbType}`);
    }
  }

  getUsers(): IUserRepository {
    if (!this.userRepository) {
      throw new Error("DatabaseManager has not been initialized. Call initialize() first.");
    }
    return this.userRepository;
  }

  getAuditLogs(): IAuditLogRepository {
    if (!this.auditLogRepository) {
      throw new Error("DatabaseManager has not been initialized. Call initialize() first.");
    }
    return this.auditLogRepository;
  }
}

// Export a singleton instance
export const dbManager = new DatabaseManager();
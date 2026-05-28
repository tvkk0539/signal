import { IUserRepository } from '../../interfaces/IUserRepository';
import type { User } from '../../interfaces/IUserRepository';

export class PostgresUserRepository implements IUserRepository {
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || '';
    console.log(`[Postgres] Initialized User Repository mapping.`);
  }

  async findByEmail(email: string): Promise<User | null> {
    console.log(`[Postgres] (Stub) findByEmail: ${email}`);
    return null;
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    console.log(`[Postgres] (Stub) createUser: ${user.email}`);
    return {
      ...user,
      id: `pg-${Date.now()}`,
      createdAt: new Date()
    };
  }
}

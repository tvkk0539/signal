import { IUserRepository, User } from '../interfaces/IUserRepository';

/**
 * The Replication Engine for User Repositories.
 * Writes synchronously to the primary database, and asynchronously ("fire-and-forget") to all mirrors.
 * Reads always hit the primary database.
 */
export class ReplicatedUserRepository implements IUserRepository {
  constructor(
    private primary: IUserRepository,
    private mirrors: IUserRepository[] = []
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    // Reads always hit the primary source of truth
    return this.primary.findByEmail(email);
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // 1. Await primary write (Zero-Delay for UI)
    const createdUser = await this.primary.createUser(user);

    // 2. Fire-and-Forget async mirror writes
    this.mirrors.forEach(mirror => {
      // Re-use the exact generated ID and timestamp from the primary to ensure exact replication
      mirror.createUser(createdUser as Omit<User, 'id' | 'createdAt'>).catch(err => {
        console.error(`[Replication Engine] Mirror write failed for User ${createdUser.email}:`, err);
      });
    });

    return createdUser;
  }
}

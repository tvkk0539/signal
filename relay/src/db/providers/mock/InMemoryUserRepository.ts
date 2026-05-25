import { IUserRepository, User } from '../../interfaces/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = this.nextId.toString();
    this.nextId++;

    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date()
    };

    this.users.set(id, newUser);
    return newUser;
  }
}
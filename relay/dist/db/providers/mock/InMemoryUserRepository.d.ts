import { IUserRepository, User } from '../../interfaces/IUserRepository';
export declare class InMemoryUserRepository implements IUserRepository {
    private users;
    private nextId;
    findByEmail(email: string): Promise<User | null>;
    createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

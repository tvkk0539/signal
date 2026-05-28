import { IUserRepository } from '../../interfaces/IUserRepository';
import type { User } from '../../interfaces/IUserRepository';
export declare class PostgresUserRepository implements IUserRepository {
    private connectionString;
    constructor(connectionString?: string);
    findByEmail(email: string): Promise<User | null>;
    createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

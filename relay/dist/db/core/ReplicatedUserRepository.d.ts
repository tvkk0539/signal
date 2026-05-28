import { IUserRepository, User } from '../interfaces/IUserRepository';
/**
 * The Replication Engine for User Repositories.
 * Writes synchronously to the primary database, and asynchronously ("fire-and-forget") to all mirrors.
 * Reads always hit the primary database.
 */
export declare class ReplicatedUserRepository implements IUserRepository {
    private primary;
    private mirrors;
    constructor(primary: IUserRepository, mirrors?: IUserRepository[]);
    findByEmail(email: string): Promise<User | null>;
    createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

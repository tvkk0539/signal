import { Connection } from 'mongoose';
import { IUserRepository, User } from '../../interfaces/IUserRepository';
export declare class MongoUserRepository implements IUserRepository {
    private userModel;
    constructor(connection: Connection);
    findByEmail(email: string): Promise<User | null>;
    createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

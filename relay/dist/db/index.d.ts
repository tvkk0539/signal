import { IUserRepository } from './interfaces/IUserRepository';
declare class DatabaseManager {
    private userRepository;
    initialize(): Promise<void>;
    getUsers(): IUserRepository;
}
export declare const dbManager: DatabaseManager;
export {};

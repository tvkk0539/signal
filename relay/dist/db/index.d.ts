import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
declare class DatabaseManager {
    private userRepository;
    private auditLogRepository;
    initialize(): Promise<void>;
    getUsers(): IUserRepository;
    getAuditLogs(): IAuditLogRepository;
}
export declare const dbManager: DatabaseManager;
export {};

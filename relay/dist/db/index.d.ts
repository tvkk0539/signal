import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { IChatRepository } from './interfaces/IChatRepository';
export type DatabaseEngine = 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
export type DomainService = 'AUTH' | 'AUDIT' | 'CHAT';
export interface DatabaseConfig {
    engine: DatabaseEngine;
    connectionString?: string;
    apiKey?: string;
    isMirror?: boolean;
}
export interface DomainRoutingConfig {
    primary: DatabaseConfig;
    mirrors: DatabaseConfig[];
}
declare class DatabaseManager {
    private userRepository;
    private auditLogRepository;
    private chatRepository;
    private currentRouting;
    initialize(): Promise<void>;
    hotSwapDomain(domain: DomainService, config: DomainRoutingConfig): Promise<void>;
    getRoutingState(): Record<string, {
        primary: {
            engine: string;
        };
        mirrors: {
            engine: string;
        }[];
    }>;
    private instantiateDomainRepository;
    private instantiateUserRepository;
    private instantiateAuditRepository;
    private instantiateChatRepository;
    getUsers(): IUserRepository;
    getAuditLogs(): IAuditLogRepository;
    getChat(): IChatRepository;
}
export declare const dbManager: DatabaseManager;
export {};

import { IUserRepository } from './interfaces/IUserRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';
import { IChatRepository } from './interfaces/IChatRepository';
import { IAppleMusicRepository } from './interfaces/IAppleMusicRepository';
import { IVfsIndexRepository } from './interfaces/IVfsIndexRepository';
export type DatabaseEngine = 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
export type DomainService = 'AUTH' | 'AUDIT' | 'CHAT' | 'APPLE_MUSIC' | 'VFS_EPHEMERAL' | 'VFS_PERMANENT';
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
    private appleMusicRepository;
    private vfsEphemeralRepository;
    private vfsPermanentRepository;
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
    private instantiateAppleMusicRepository;
    private instantiateVfsIndexRepository;
    getUsers(): IUserRepository;
    getAuditLogs(): IAuditLogRepository;
    getChat(): IChatRepository;
    getAppleMusic(): IAppleMusicRepository;
    getVfsEphemeral(): IVfsIndexRepository;
    getVfsPermanent(): IVfsIndexRepository;
}
export declare const dbManager: DatabaseManager;
export {};

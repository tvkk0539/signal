import { EventEmitter } from 'events';
export declare class AppleMusicWrapperManager extends EventEmitter {
    private static instance;
    private readonly BASE_DIR;
    private readonly APP_DIR;
    private readonly WRAPPER_DIR;
    private readonly BINARY_NAME;
    private readonly DOWNLOAD_URL_X86;
    private readonly DOWNLOAD_URL_ARM;
    private process;
    private logHistory;
    private readonly MAX_LOGS;
    private constructor();
    static getInstance(): AppleMusicWrapperManager;
    private log;
    isInstalled(): boolean;
    getStatus(): {
        installed: boolean;
        running: boolean;
        pid: number | null | undefined;
        logs: string[];
    };
    install(): Promise<void>;
    start(username?: string, password?: string): Promise<void>;
    stop(): void;
    sendInput(text: string): void;
}

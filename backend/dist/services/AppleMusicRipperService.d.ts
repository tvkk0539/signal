import { EventEmitter } from 'events';
export interface RipperConfig {
    url: string;
    mediaUserToken: string;
    authorizationToken?: string;
    format: 'alac' | 'flac' | 'atmos' | 'aac';
    qualityLimit: '192000' | '96000' | '48000';
    embedLrc: boolean;
    animatedArt: boolean;
    storefront?: string;
    autoUpload?: boolean;
    rcloneRemote?: string;
    lrcFormat?: 'lrc' | 'ttml';
    lrcType?: 'lyrics' | 'syllable-lyrics';
    language?: string;
    tagSortOrder?: boolean;
    saveLrcFile?: boolean;
    saveArtistCover?: boolean;
    useSongInfoForPlaylist?: boolean;
    alacFix?: boolean;
}
export declare class AppleMusicRipperService extends EventEmitter {
    private readonly BASE_DIR;
    private readonly APP_DIR;
    private readonly BINARY_PATH;
    private activeJobs;
    constructor();
    private log;
    /**
     * Dynamically generates the config.yaml required by the Go Ripper.
     */
    private generateConfigYaml;
    /**
     * Initializes an isolated Workspace, generates the config, and spawns the Go Ripper.
     */
    executeRipJob(config: RipperConfig): Promise<{
        jobId: string;
    }>;
    cancelJob(jobId: string): void;
}

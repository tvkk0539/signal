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
    coverSize?: string;
    coverFormat?: 'jpg' | 'png' | 'original';
    explicitChoice?: string;
    cleanChoice?: string;
    appleMasterChoice?: string;
    albumFolderFormat?: string;
    playlistFolderFormat?: string;
    songFileFormat?: string;
    artistFolderFormat?: string;
    maxMemoryLimit?: number;
    exitOnError?: boolean;
    getM3u8Mode?: 'all' | 'hires';
    aacType?: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix';
    mvAudioType?: 'atmos' | 'ac3' | 'aac';
    mvMax?: number;
    limitMax?: number;
    dlAlbumcoverForPlaylist?: boolean;
    embyAnimatedArtwork?: boolean;
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
     * Engineered as a Zero-Dependency Configuration Template Engine to guarantee 1:1 parity
     * with the original Go binary's expected structure, preserving comments and exact quoting.
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

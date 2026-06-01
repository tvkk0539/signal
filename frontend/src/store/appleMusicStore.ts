import { create } from 'zustand';

interface AppleMusicState {
    mediaUserToken: string;
    storefront: string;
    alacFix: boolean;
    autoUpload: boolean;
    rcloneRemote: string;
    lrcFormat: 'lrc' | 'ttml';
    lrcType: 'lyrics' | 'syllable-lyrics';
    language: string;
    tagSortOrder: boolean;
    saveLrcFile: boolean;
    saveArtistCover: boolean;
    useSongInfoForPlaylist: boolean;
    coverSize: string;
    coverFormat: 'jpg' | 'png' | 'original';
    explicitChoice: string;
    cleanChoice: string;
    appleMasterChoice: string;
    albumFolderFormat: string;
    playlistFolderFormat: string;
    songFileFormat: string;
    artistFolderFormat: string;
    maxMemoryLimit: number;
    exitOnError: boolean;
    getM3u8Mode: 'all' | 'hires';
    aacType: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix';
    mvAudioType: 'atmos' | 'ac3' | 'aac';
    mvMax: number;
    limitMax: number;
    dlAlbumcoverForPlaylist: boolean;
    embyAnimatedArtwork: boolean;
    convertAfterDownload: boolean;
    convertFormat: string;
    convertKeepOriginal: boolean;
    convertSkipIfSourceMatches: boolean;
    convertWithMetadata: boolean;
    convertWarnLossyToLossless: boolean;
    convertSkipLossyToLossless: boolean;
    convertCheckBadAlac: boolean;
    convertDeleteBadAlac: boolean;

    setMediaUserToken: (val: string) => void;
    setStorefront: (val: string) => void;
    setAlacFix: (val: boolean) => void;
    setAutoUpload: (val: boolean) => void;
    setRcloneRemote: (val: string) => void;
    setLrcFormat: (val: 'lrc' | 'ttml') => void;
    setLrcType: (val: 'lyrics' | 'syllable-lyrics') => void;
    setLanguage: (val: string) => void;
    setTagSortOrder: (val: boolean) => void;
    setSaveLrcFile: (val: boolean) => void;
    setSaveArtistCover: (val: boolean) => void;
    setUseSongInfoForPlaylist: (val: boolean) => void;
    setCoverSize: (val: string) => void;
    setCoverFormat: (val: 'jpg' | 'png' | 'original') => void;
    setExplicitChoice: (val: string) => void;
    setCleanChoice: (val: string) => void;
    setAppleMasterChoice: (val: string) => void;
    setAlbumFolderFormat: (val: string) => void;
    setPlaylistFolderFormat: (val: string) => void;
    setSongFileFormat: (val: string) => void;
    setArtistFolderFormat: (val: string) => void;
    setMaxMemoryLimit: (val: number) => void;
    setExitOnError: (val: boolean) => void;
    setGetM3u8Mode: (val: 'all' | 'hires') => void;
    setAacType: (val: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix') => void;
    setMvAudioType: (val: 'atmos' | 'ac3' | 'aac') => void;
    setMvMax: (val: number) => void;
    setLimitMax: (val: number) => void;
    setDlAlbumcoverForPlaylist: (val: boolean) => void;
    setEmbyAnimatedArtwork: (val: boolean) => void;
    setConvertAfterDownload: (val: boolean) => void;
    setConvertFormat: (val: string) => void;
    setConvertKeepOriginal: (val: boolean) => void;
    setConvertSkipIfSourceMatches: (val: boolean) => void;
    setConvertWithMetadata: (val: boolean) => void;
    setConvertWarnLossyToLossless: (val: boolean) => void;
    setConvertSkipLossyToLossless: (val: boolean) => void;
    setConvertCheckBadAlac: (val: boolean) => void;
    setConvertDeleteBadAlac: (val: boolean) => void;

    // Advanced Wrapper Telemetry State
    wrapperIsInstalled: boolean;
    wrapperIsRunning: boolean;
    wrapperPid: number | null;
    wrapperLogs: string[];
    wrapperNeeds2FA: boolean;
    setWrapperStatus: (installed: boolean, running: boolean, pid: number | null, logs: string[]) => void;
    setWrapperNeeds2FA: (val: boolean) => void;
    appendWrapperLog: (log: string) => void;
}

export const useAppleMusicStore = create<AppleMusicState>((set) => ({
    mediaUserToken: '',
    storefront: 'us',
    alacFix: false,
    autoUpload: true,
    rcloneRemote: 'remote:/Media/AppleMusic_Rips',
    lrcFormat: 'lrc',
    lrcType: 'lyrics',
    language: '',
    tagSortOrder: true,
    saveLrcFile: false,
    saveArtistCover: false,
    useSongInfoForPlaylist: false,
    coverSize: "5000x5000",
    coverFormat: "jpg",
    explicitChoice: "[E]",
    cleanChoice: "[C]",
    appleMasterChoice: "[M]",
    albumFolderFormat: "{AlbumName}",
    playlistFolderFormat: "{PlaylistName}",
    songFileFormat: "{SongNumer}. {SongName}",
    artistFolderFormat: "{UrlArtistName}",
    maxMemoryLimit: 256,
    exitOnError: false,
    getM3u8Mode: "hires",
    aacType: "aac-lc",
    mvAudioType: "atmos",
    mvMax: 2160,
    limitMax: 200,
    dlAlbumcoverForPlaylist: false,
    embyAnimatedArtwork: false,
    convertAfterDownload: false,
    convertFormat: "flac",
    convertKeepOriginal: false,
    convertSkipIfSourceMatches: true,
    convertWithMetadata: true,
    convertWarnLossyToLossless: true,
    convertSkipLossyToLossless: true,
    convertCheckBadAlac: false,
    convertDeleteBadAlac: false,

    setMediaUserToken: (val) => set({ mediaUserToken: val }),
    setStorefront: (val) => set({ storefront: val }),
    setAlacFix: (val) => set({ alacFix: val }),
    setAutoUpload: (val) => set({ autoUpload: val }),
    setRcloneRemote: (val) => set({ rcloneRemote: val }),
    setLrcFormat: (val) => set({ lrcFormat: val }),
    setLrcType: (val) => set({ lrcType: val }),
    setLanguage: (val) => set({ language: val }),
    setTagSortOrder: (val) => set({ tagSortOrder: val }),
    setSaveLrcFile: (val) => set({ saveLrcFile: val }),
    setSaveArtistCover: (val) => set({ saveArtistCover: val }),
    setUseSongInfoForPlaylist: (val) => set({ useSongInfoForPlaylist: val }),
    setCoverSize: (val) => set({ coverSize: val }),
    setCoverFormat: (val) => set({ coverFormat: val }),
    setExplicitChoice: (val) => set({ explicitChoice: val }),
    setCleanChoice: (val) => set({ cleanChoice: val }),
    setAppleMasterChoice: (val) => set({ appleMasterChoice: val }),
    setAlbumFolderFormat: (val) => set({ albumFolderFormat: val }),
    setPlaylistFolderFormat: (val) => set({ playlistFolderFormat: val }),
    setSongFileFormat: (val) => set({ songFileFormat: val }),
    setArtistFolderFormat: (val) => set({ artistFolderFormat: val }),
    setMaxMemoryLimit: (val) => set({ maxMemoryLimit: val }),
    setExitOnError: (val) => set({ exitOnError: val }),
    setGetM3u8Mode: (val) => set({ getM3u8Mode: val }),
    setAacType: (val) => set({ aacType: val }),
    setMvAudioType: (val) => set({ mvAudioType: val }),
    setMvMax: (val) => set({ mvMax: val }),
    setLimitMax: (val) => set({ limitMax: val }),
    setDlAlbumcoverForPlaylist: (val) => set({ dlAlbumcoverForPlaylist: val }),
    setEmbyAnimatedArtwork: (val) => set({ embyAnimatedArtwork: val }),
    setConvertAfterDownload: (val) => set({ convertAfterDownload: val }),
    setConvertFormat: (val) => set({ convertFormat: val }),
    setConvertKeepOriginal: (val) => set({ convertKeepOriginal: val }),
    setConvertSkipIfSourceMatches: (val) => set({ convertSkipIfSourceMatches: val }),
    setConvertWithMetadata: (val) => set({ convertWithMetadata: val }),
    setConvertWarnLossyToLossless: (val) => set({ convertWarnLossyToLossless: val }),
    setConvertSkipLossyToLossless: (val) => set({ convertSkipLossyToLossless: val }),
    setConvertCheckBadAlac: (val) => set({ convertCheckBadAlac: val }),
    setConvertDeleteBadAlac: (val) => set({ convertDeleteBadAlac: val }),

    wrapperIsInstalled: false,
    wrapperIsRunning: false,
    wrapperPid: null,
    wrapperLogs: ["# Swarm Proxy Environment Initialization Complete."],
    wrapperNeeds2FA: false,
    setWrapperStatus: (installed, running, pid, logs) => set((state) => ({
        wrapperIsInstalled: installed,
        wrapperIsRunning: running,
        wrapperPid: pid,
        wrapperLogs: logs.length > 0 ? logs : state.wrapperLogs
    })),
    setWrapperNeeds2FA: (val) => set({ wrapperNeeds2FA: val }),
    appendWrapperLog: (log) => set((state) => {
        const newLogs = [...state.wrapperLogs, log];
        if (newLogs.length > 100) newLogs.shift();
        return { wrapperLogs: newLogs };
    })
}));
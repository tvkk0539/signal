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
import { create } from 'zustand';

interface AppleMusicState {
    mediaUserToken: string;
    storefront: string;
    alacFix: boolean;
    autoUpload: boolean;
    rcloneRemote: string;
    setMediaUserToken: (val: string) => void;
    setStorefront: (val: string) => void;
    setAlacFix: (val: boolean) => void;
    setAutoUpload: (val: boolean) => void;
    setRcloneRemote: (val: string) => void;

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
    setMediaUserToken: (val) => set({ mediaUserToken: val }),
    setStorefront: (val) => set({ storefront: val }),
    setAlacFix: (val) => set({ alacFix: val }),
    setAutoUpload: (val) => set({ autoUpload: val }),
    setRcloneRemote: (val) => set({ rcloneRemote: val }),

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
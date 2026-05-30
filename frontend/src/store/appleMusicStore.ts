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
    setRcloneRemote: (val) => set({ rcloneRemote: val })
}));
import { create } from 'zustand';

export type AppView = 'EXPLORER' | 'CHAT' | 'DB_OPS' | 'MUSIC_RIPS' | 'APPLE_MUSIC' | 'RCLONE_CONFIG';

interface LayoutState {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isTelemetryOpen: boolean;
  setTelemetryOpen: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeView: 'EXPLORER',
  setActiveView: (view) => set({ activeView: view }),
  isTelemetryOpen: false,
  setTelemetryOpen: (isOpen) => set({ isTelemetryOpen: isOpen }),
}));

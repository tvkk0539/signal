import { create } from 'zustand';

type AppView = 'EXPLORER' | 'CHAT' | 'DB_OPS' | 'MUSIC_RIPS' | 'APPLE_MUSIC' | 'SETTINGS';

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

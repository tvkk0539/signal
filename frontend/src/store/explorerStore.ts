import { create } from 'zustand';

interface ExplorerState {
  pendingTargetFs?: string;
  pendingTargetPath?: string;
  setExplorerTarget: (fs: string, path: string) => void;
  clearExplorerTarget: () => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  pendingTargetFs: undefined,
  pendingTargetPath: undefined,
  setExplorerTarget: (fs, path) => set({ pendingTargetFs: fs, pendingTargetPath: path }),
  clearExplorerTarget: () => set({ pendingTargetFs: undefined, pendingTargetPath: undefined }),
}));

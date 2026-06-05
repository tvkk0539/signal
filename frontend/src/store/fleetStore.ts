import { create } from 'zustand';

interface FleetState {
  workers: string[];
  setWorkers: (workers: string[]) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  workers: [],
  setWorkers: (workers) => set({ workers }),
}));

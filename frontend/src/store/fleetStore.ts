import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FleetState {
  workers: string[]; // Live list, should NOT be persisted
  targetWorkerId: string | null; // Global selected worker
  setWorkers: (workers: string[]) => void;
  setTargetWorkerId: (id: string | null) => void;
}

export const useFleetStore = create<FleetState>()(
  persist(
    (set) => ({
      workers: [],
      targetWorkerId: null,
      setWorkers: (workers) => set({ workers }),
      setTargetWorkerId: (id) => set({ targetWorkerId: id }),
    }),
    {
      name: 'swarm-fleet-store',
      // Only persist the targetWorkerId. The live workers array must be rebuilt on WebSocket connect.
      partialize: (state) => ({ targetWorkerId: state.targetWorkerId }),
    }
  )
);

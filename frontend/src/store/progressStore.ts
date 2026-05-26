import { create } from 'zustand';

interface TaskProgressState {
  tasks: { [taskId: string]: { progress: number; status: string; workerId: string } };
  updateTaskProgress: (taskId: string, workerId: string, progress: number, status: string) => void;
  clearTasks: () => void;
}

// Optimization: We throttle re-renders to 100ms in the UI layer,
// but Zustand state itself can safely accept the firehose of updates.
export const useProgressStore = create<TaskProgressState>((set) => ({
  tasks: {},
  updateTaskProgress: (taskId, workerId, progress, status) => set((state) => ({
    tasks: {
      ...state.tasks,
      [taskId]: { progress, status, workerId }
    }
  })),
  clearTasks: () => set({ tasks: {} })
}));

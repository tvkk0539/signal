import { create } from 'zustand';

interface TaskProgressState {
  tasks: { [taskId: string]: { progress: number; status: string; workerId: string } };
  setTasks: (tasks: { [taskId: string]: { progress: number; status: string; workerId: string } }) => void;
  updateTaskProgress: (taskId: string, workerId: string, progress: number, status: string) => void;
  clearTasks: () => void;
}

// Optimization: We throttle re-renders to 100ms in the Web Worker layer now.
// The Worker will periodically pass a complete batch of the current task state.
export const useProgressStore = create<TaskProgressState>((set) => ({
  tasks: {},
  setTasks: (tasks) => set({ tasks }),
  updateTaskProgress: (taskId, workerId, progress, status) => set((state) => ({
    tasks: {
      ...state.tasks,
      [taskId]: { progress, status, workerId }
    }
  })),
  clearTasks: () => set({ tasks: {} })
}));

import { create } from 'zustand';

interface TaskProgressState {
  tasks: { [taskId: string]: { progress: number; status: string; workerId: string } };
  setTasks: (tasks: { [taskId: string]: { progress: number; status: string; workerId: string } }) => void;
  updateTaskProgress: (taskId: string, workerId: string, progress: number, status: string) => void;
  clearTasks: () => void;
  clearTasksByFilter: (filter: 'SUCCESS' | 'ERROR') => void;
  removeTask: (taskId: string) => void;
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
  clearTasks: () => set((state) => {
    // Only clear inactive tasks (success = 100, error/cancel = -1)
    const newTasks = { ...state.tasks };
    for (const id in newTasks) {
      if (newTasks[id].progress === 100 || newTasks[id].progress === -1) {
        delete newTasks[id];
      }
    }
    return { tasks: newTasks };
  }),
  clearTasksByFilter: (filter) => set((state) => {
    const newTasks = { ...state.tasks };
    for (const id in newTasks) {
      if (filter === 'SUCCESS' && newTasks[id].progress === 100) {
        delete newTasks[id];
      } else if (filter === 'ERROR' && newTasks[id].progress === -1) {
        delete newTasks[id];
      }
    }
    return { tasks: newTasks };
  }),
  removeTask: (taskId) => set((state) => {
    const newTasks = { ...state.tasks };
    delete newTasks[taskId];
    return { tasks: newTasks };
  })
}));

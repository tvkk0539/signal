import { create } from 'zustand';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Job {
  jobId: string;
  url: string;
  status: JobStatus;
  configSnapshot: any;
  logs: string[];
}

interface AppleMusicQueueState {
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  appendLog: (jobId: string, log: string) => void;
  removeJobs: (jobIds: string[]) => void;
}

export const useAppleMusicQueueStore = create<AppleMusicQueueState>((set) => ({
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJobStatus: (jobId, status) => set((state) => ({
    jobs: state.jobs.map((j) => (j.jobId === jobId ? { ...j, status } : j)),
  })),
  appendLog: (jobId, log) => set((state) => ({
    jobs: state.jobs.map((j) => (j.jobId === jobId ? { ...j, logs: [...j.logs, log] } : j)),
  })),
  removeJobs: (jobIds) => set((state) => ({
    jobs: state.jobs.filter((j) => !jobIds.includes(j.jobId)),
  })),
}));

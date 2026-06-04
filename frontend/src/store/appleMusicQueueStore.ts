import { create } from 'zustand';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Job {
  jobId: string;
  workerId: string;
  url: string;
  status: JobStatus;
  configSnapshot: any;
  logs: string[];
  progressPhase?: string;
  progressPercent?: number;
  progressDataMetrics?: string;
  progressSpeed?: string;
  uploadPath?: string;
}

interface AppleMusicQueueState {
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  appendLog: (jobId: string, log: string, uploadPath?: string) => void;
  updateJobProgress: (jobId: string, phase: string, percent: number, dataMetrics: string, speed: string) => void;
  removeJobs: (jobIds: string[]) => void;
}

export const useAppleMusicQueueStore = create<AppleMusicQueueState>((set) => ({
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJobStatus: (jobId, status) => set((state) => ({
    jobs: state.jobs.map((j) => (j.jobId === jobId ? { ...j, status } : j)),
  })),
  appendLog: (jobId, log, uploadPath) => set((state) => ({
    jobs: state.jobs.map((j) => (j.jobId === jobId ? { ...j, logs: [...j.logs, log], uploadPath: uploadPath || j.uploadPath } : j)),
  })),
  updateJobProgress: (jobId, phase, percent, dataMetrics, speed) => set((state) => ({
    jobs: state.jobs.map((j) => (j.jobId === jobId ? { ...j, progressPhase: phase, progressPercent: percent, progressDataMetrics: dataMetrics, progressSpeed: speed } : j)),
  })),
  removeJobs: (jobIds) => set((state) => ({
    jobs: state.jobs.filter((j) => !jobIds.includes(j.jobId)),
  })),
}));

import React, { useEffect } from 'react';
import { MessageType } from '@swarm/shared';
import type { VfsTaskCancelRequestMessage } from '@swarm/shared';
import { useProgressStore } from '../../store/progressStore';
import { SocketManager } from '../../worker/SocketManager';
import { XCircle } from 'lucide-react';

interface JobManagerProps {
  isConnected?: boolean;
}

export const JobManager: React.FC<JobManagerProps> = () => {
  // We subscribe directly to the store now.
  // The Web Worker manages the 100ms flush, so the store is only updated safely.
  const uiTasks = useProgressStore((state) => state.tasks);
  const setTasks = useProgressStore((state) => state.setTasks);
  const clearTasks = useProgressStore((state) => state.clearTasks);
  const clearTasksByFilter = useProgressStore((state) => state.clearTasksByFilter);

  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    const handleBatchProgress = (batch: any) => {
      // The Web Worker passes the whole aggregated dictionary
      setTasks(batch);
    };

    socketManager.on('TASK_PROGRESS_BATCH', handleBatchProgress);

    return () => {
      socketManager.off('TASK_PROGRESS_BATCH', handleBatchProgress);
    };
  }, [setTasks]);

  const handleCancelTask = (taskId: string, workerId: string) => {
    const payload: VfsTaskCancelRequestMessage = {
      type: MessageType.VFS_TASK_CANCEL_REQUEST,
      timestamp: Date.now(),
      workerId,
      jobId: taskId
    };
    socketManager.emit(MessageType.VFS_TASK_CANCEL_REQUEST, payload);

    // Optimistically update UI to show it's cancelled
    const currentTask = uiTasks[taskId];
    if (currentTask) {
       setTasks({ ...uiTasks, [taskId]: { ...currentTask, status: 'Cancelled', progress: -1 }});
    }
  };

  const taskEntries = Object.entries(uiTasks);
  const activeTasks = taskEntries.filter(([, data]) => data.progress >= 0 && data.progress < 100);

  return (
    <div className="w-full h-full flex gap-6">
      {/* Task Queue Grid (Full Width now) */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex justify-between items-center mb-3 px-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
            VFS Global Task Queue
            <span className="ml-2 bg-primary/20 border border-primary/30 text-primary px-2 py-0.5 rounded-full text-[10px]">
              {activeTasks.length} Active
            </span>
          </h4>
          {taskEntries.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => clearTasksByFilter('SUCCESS')} className="text-[10px] text-emerald-500 hover:bg-emerald-500/10 transition-colors font-medium border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Clear Successful
              </button>
              <button onClick={() => clearTasksByFilter('ERROR')} className="text-[10px] text-destructive hover:bg-destructive/10 transition-colors font-medium border border-destructive/30 px-2 py-0.5 rounded-full">
                Clear Failed
              </button>
              <button onClick={clearTasks} className="text-[10px] text-muted-foreground hover:bg-white/5 transition-colors font-medium border border-border px-2 py-0.5 rounded-full">
                Clear All Inactive
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {taskEntries.map(([taskId, data]) => {
            const isComplete = data.progress === 100;
            const isError = data.progress === -1;
            const isActive = !isComplete && !isError;

            return (
              <div key={taskId} className="bg-card/40 border border-border/50 rounded-lg p-3 flex flex-col gap-2 hover:bg-card/60 transition-colors group relative">
                {isActive && (
                  <button
                    onClick={() => handleCancelTask(taskId, data.workerId)}
                    className="absolute -top-2 -right-2 bg-background rounded-full text-muted-foreground hover:text-destructive shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Cancel Task"
                  >
                    <XCircle size={18} className="fill-background" />
                  </button>
                )}

                <div className="flex justify-between items-start text-xs gap-2">
                  <span className="font-mono text-muted-foreground truncate w-20" title={taskId}>
                     {taskId.split('-')[0]}...
                  </span>
                  <span className={`font-medium truncate flex-1 text-right ${isComplete ? 'text-emerald-500' : isError ? 'text-destructive' : 'text-primary'}`} title={data.status}>
                    {data.status}
                  </span>
                </div>

                <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden mt-auto">
                  <div
                    className={`h-full transition-all duration-200 ease-linear ${isComplete ? 'bg-emerald-500 shadow-[0_0_10px_rgba(46,204,113,0.5)]' : isError ? 'bg-destructive shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(170,59,255,0.5)]'}`}
                    style={{ width: `${Math.max(0, data.progress)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {taskEntries.length === 0 && (
            <div className="col-span-full h-full min-h-[100px] flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border/30 rounded-xl p-8">
              Telemetry queue is empty. No active jobs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

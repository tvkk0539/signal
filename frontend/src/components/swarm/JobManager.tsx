import React, { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { BatchTaskRequestMessage } from '@swarm/shared';
import { useProgressStore } from '../../store/progressStore';
import { SocketManager } from '../../worker/SocketManager';

interface JobManagerProps {
  isConnected: boolean;
}

export const JobManager: React.FC<JobManagerProps> = ({ isConnected }) => {
  // We subscribe directly to the store now.
  // The Web Worker manages the 100ms flush, so the store is only updated safely.
  const uiTasks = useProgressStore((state) => state.tasks);
  const setTasks = useProgressStore((state) => state.setTasks);
  const clearTasks = useProgressStore((state) => state.clearTasks);

  const [tasksToSubmit, setTasksToSubmit] = useState<number>(10);
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

  const handleStartBatch = () => {
    if (!isConnected) return;

    clearTasks();
    socketManager.clearTasks(); // Clear the worker's buffer too

    const batch: Array<{ id: string; action: string; payload: any }> = [];
    for (let i = 0; i < tasksToSubmit; i++) {
      batch.push({
        id: `task-${Date.now()}-${i}`,
        action: 'DOWNLOAD',
        payload: { file: `dummy-file-${i}.zip` }
      });
    }

    const payload: BatchTaskRequestMessage = {
      type: MessageType.BATCH_TASK_REQUEST,
      timestamp: Date.now(),
      tasks: batch
    };

    console.log(`[Job Manager] Submitting BATCH_TASK_REQUEST with ${batch.length} tasks`);
    socketManager.emit(MessageType.BATCH_TASK_REQUEST, payload);
  };

  const taskEntries = Object.entries(uiTasks);

  const activeTasks = taskEntries.filter(([, data]) => data.progress < 100);

  return (
    <div className="w-full h-full flex gap-6">

      {/* Simulation Controls (Left side of drawer) */}
      <div className="w-80 flex-none bg-card/20 p-4 rounded-xl border border-border/50 flex flex-col h-full shadow-inner">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Task Generator</h4>
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2 mt-auto">
            <input
              type="number"
              value={tasksToSubmit}
              onChange={e => setTasksToSubmit(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-background border border-border rounded-lg p-2 text-xs text-foreground text-center outline-none focus:border-primary/50"
              min="1"
              max="1000"
            />
            <button
              onClick={handleStartBatch}
              disabled={!isConnected}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium p-2 rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(170,59,255,0.2)]"
            >
              Trigger Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Task Queue Grid (Right side of drawer) */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex justify-between items-center mb-3 px-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
            Active Jobs
            <span className="ml-2 bg-primary/20 border border-primary/30 text-primary px-2 py-0.5 rounded-full text-[10px]">
              {activeTasks.length}
            </span>
          </h4>
          {taskEntries.length > 0 && (
             <button onClick={clearTasks} className="text-xs text-destructive hover:text-destructive/80 transition-colors">
               Clear History
             </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {taskEntries.map(([taskId, data]) => {
            const isComplete = data.progress === 100;
            return (
              <div key={taskId} className="bg-card/40 border border-border/50 rounded-lg p-3 flex flex-col gap-2 hover:bg-card/60 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-muted-foreground truncate w-24" title={data.workerId}>
                     {data.workerId.substring(0, 6)}...
                  </span>
                  <span className={`font-medium ${isComplete ? 'text-emerald-500' : 'text-primary'}`}>
                    {data.status}
                  </span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ease-linear ${isComplete ? 'bg-emerald-500 shadow-[0_0_10px_rgba(46,204,113,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(170,59,255,0.5)]'}`}
                    style={{ width: `${data.progress}%` }}
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

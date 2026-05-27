import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { TaskProgressMessage, BatchTaskRequestMessage } from '@swarm/shared';
import { useProgressStore } from '../../store/progressStore';

interface JobManagerProps {
  socket: Socket | null;
  isConnected: boolean;
}

export const JobManager: React.FC<JobManagerProps> = ({ socket, isConnected }) => {
  // Only subscribe to the actions to prevent re-rendering on every task update
  const updateTaskProgress = useProgressStore((state) => state.updateTaskProgress);
  const clearTasks = useProgressStore((state) => state.clearTasks);

  const [tasksToSubmit, setTasksToSubmit] = useState<number>(10);

  // The throttled UI state to prevent re-render crashes
  const [uiTasks, setUiTasks] = useState(useProgressStore.getState().tasks);

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (msg: TaskProgressMessage) => {
      updateTaskProgress(msg.taskId, msg.workerId, msg.progress, msg.status);
    };

    socket.on(MessageType.TASK_PROGRESS, handleProgress);

    return () => {
      socket.off(MessageType.TASK_PROGRESS, handleProgress);
    };
  }, [socket, updateTaskProgress]);

  // Throttling logic: Only update React UI every 100ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      setUiTasks(useProgressStore.getState().tasks);
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  const handleStartBatch = () => {
    if (!socket || !isConnected) return;

    clearTasks();

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
    socket.emit(MessageType.BATCH_TASK_REQUEST, payload);
  };

  const taskEntries = Object.entries(uiTasks);

  return (
    <div style={{
      width: '350px',
      backgroundColor: '#2a2d34',
      color: 'white',
      padding: '20px',
      borderLeft: '1px solid #444',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        Job Manager
      </h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <input
          type="number"
          value={tasksToSubmit}
          onChange={(e) => setTasksToSubmit(Number(e.target.value))}
          style={{ width: '60px', padding: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
        />
        <button
          onClick={handleStartBatch}
          disabled={!isConnected}
          style={{ padding: '8px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: isConnected ? 'pointer' : 'not-allowed', flex: 1 }}
        >
          Submit Batch
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {taskEntries.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '10px' }}>
            No active jobs.
          </div>
        ) : (
          taskEntries.map(([taskId, data]) => (
            <div key={taskId} style={{ padding: '10px', backgroundColor: '#3a3d45', borderRadius: '6px', border: '1px solid #444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#aaa' }}>
                <span style={{ fontFamily: 'monospace' }}>{taskId.split('-')[2]}</span>
                <span style={{ color: '#4a90e2', fontWeight: 'bold' }}>Worker: {data.workerId.substring(0, 6)}...</span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.progress}%`, backgroundColor: data.progress === 100 ? '#2ecc71' : '#f39c12', transition: 'width 0.1s' }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', marginTop: '5px' }}>
                {data.progress}% - {data.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

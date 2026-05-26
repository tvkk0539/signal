import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { FleetStateUpdateMessage } from '@swarm/shared';

interface FleetSidebarProps {
  socket: Socket | null;
  targetWorkerId: string;
  setTargetWorkerId: (id: string) => void;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({ socket, targetWorkerId, setTargetWorkerId }) => {
  const [workers, setWorkers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleFleetUpdate = (msg: FleetStateUpdateMessage) => {
      console.log(`[UI] Fleet State Updated. Active Workers: ${msg.workers.length}`);
      setWorkers(msg.workers);

      // If the currently selected worker disconnected, clear it
      if (targetWorkerId && !msg.workers.includes(targetWorkerId)) {
        setTargetWorkerId('');
      }
    };

    socket.on(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);

    return () => {
      socket.off(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);
    };
  }, [socket, targetWorkerId, setTargetWorkerId]);

  return (
    <div style={{
      width: '300px',
      backgroundColor: '#2a2d34',
      color: 'white',
      padding: '20px',
      borderRight: '1px solid #444',
      height: '100%',
      minHeight: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        Swarm Fleet
      </h2>

      <div style={{ marginBottom: '10px', fontSize: '14px', color: '#aaa' }}>
        Active Workers: <strong>{workers.length}</strong>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {workers.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '10px' }}>
            No workers connected to the Swarm.
          </div>
        ) : (
          workers.map((id) => (
            <div
              key={id}
              onClick={() => setTargetWorkerId(id)}
              style={{
                padding: '12px',
                backgroundColor: targetWorkerId === id ? '#4a90e2' : '#3a3d45',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s',
                border: targetWorkerId === id ? '1px solid #6ab0ff' : '1px solid transparent'
              }}
            >
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#2ecc71',
                marginRight: '10px',
                boxShadow: '0 0 5px #2ecc71'
              }} />
              <span style={{ fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {id}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

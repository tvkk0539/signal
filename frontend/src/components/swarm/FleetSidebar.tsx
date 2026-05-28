import React, { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { FleetStateUpdateMessage } from '@swarm/shared';
import { SocketManager } from '../../worker/SocketManager';

interface FleetSidebarProps {
  targetWorkerId: string;
  setTargetWorkerId: (id: string) => void;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({ targetWorkerId, setTargetWorkerId }) => {
  const [workers, setWorkers] = useState<string[]>([]);
  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    const handleFleetUpdate = (msg: FleetStateUpdateMessage) => {
      console.log(`[UI] Fleet State Updated. Active Workers: ${msg.workers.length}`);
      setWorkers(msg.workers);

      // If the currently selected worker disconnected, clear it
      if (targetWorkerId && !msg.workers.includes(targetWorkerId)) {
        setTargetWorkerId('');
      }
    };

    socketManager.on(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);

    return () => {
      socketManager.off(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);
    };
  }, [targetWorkerId, setTargetWorkerId]);

  return (
    <div className="w-full h-full flex flex-col bg-card/30 text-foreground">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">
          Swarm Fleet
        </h2>
        <div className="text-xs text-primary font-medium flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
           {workers.length} Active Nodes
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workers.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center italic p-4">
            No workers connected.
          </div>
        ) : (
          workers.map((id) => {
            const isSelected = targetWorkerId === id;
            return (
              <div
                key={id}
                onClick={() => setTargetWorkerId(id)}
                className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-all duration-200 border ${
                  isSelected
                    ? 'bg-primary/10 border-primary/50 text-primary shadow-sm'
                    : 'bg-transparent border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-primary shadow-[0_0_8px_rgba(170,59,255,0.8)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(46,204,113,0.5)]'}`} />
                <span className="font-mono text-xs truncate">
                  {id}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Server, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';

interface HorizontalFleetBarProps {
  targetWorkerId: string;
  setTargetWorkerId: (id: string) => void;
  isConnected: boolean;
}

export const HorizontalFleetBar: React.FC<HorizontalFleetBarProps> = ({
  targetWorkerId,
  setTargetWorkerId,
  isConnected
}) => {
  const [workers, setWorkers] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    const socketManager = SocketManager.getInstance();

    // Subscribe to fleet updates
    const handleFleetUpdate = (data: { workers: string[] }) => {
      setWorkers(data.workers);
    };

    socketManager.on(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);

    return () => {
      socketManager.off(MessageType.FLEET_STATE_UPDATE, handleFleetUpdate);
    };
  }, [isConnected]);

  // If there are no workers, don't auto-collapse, but if one is selected, we might want to keep it open until they choose to collapse
  return (
    <div className="w-full flex flex-col z-20">
      {/* The Collapse Handle / Header */}
      <div
        className="flex items-center justify-between px-6 py-2 bg-[#161b22] border-b border-border cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className={workers.length > 0 ? "text-green-400" : "text-muted-foreground"} />
          <span className="text-xs font-medium text-foreground/80 tracking-widest uppercase">
            Active Swarm Nodes ({workers.length})
          </span>
        </div>
        <div>
          {isCollapsed ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronUp size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {/* The Horizontal Node List (Animated Collapse) */}
      <div
        className={`bg-[#0f1218] border-b border-border overflow-hidden transition-all duration-300 ease-in-out flex items-center px-6 ${
          isCollapsed ? 'h-0 opacity-0 border-transparent' : 'h-16 opacity-100'
        }`}
      >
        {workers.length === 0 ? (
          <div className="text-sm text-muted-foreground italic flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
             No active workers detected in the Swarm.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto w-full pb-2 pt-2 snap-x scrollbar-thin scrollbar-thumb-border">
            {workers.map((workerId) => {
              const isActive = targetWorkerId === workerId;
              const shortId = workerId.substring(0, 8);
              return (
                <button
                  key={workerId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetWorkerId(workerId);
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-2 rounded-lg border snap-start min-w-[200px] max-w-[250px] transition-all
                    ${isActive
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(170,59,255,0.2)]'
                      : 'bg-card border-border text-foreground hover:bg-white/5'
                    }
                  `}
                >
                  <Server size={18} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  <div className="flex flex-col items-start truncate">
                    <span className="text-sm font-medium truncate">Node: {shortId}</span>
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> ONLINE
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

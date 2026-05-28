import React from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { FleetSidebar } from '../swarm/FleetSidebar';

interface ContextPanelProps {
  targetWorkerId: string;
  setTargetWorkerId: (id: string) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ targetWorkerId, setTargetWorkerId }) => {
  const { activeView } = useLayoutStore();

  return (
    <div className="w-64 flex-none bg-[#161b22] border-r border-border flex flex-col h-full shadow-lg z-10">
      {/* Dynamic Content based on Active View */}
      {activeView === 'EXPLORER' && (
        <FleetSidebar targetWorkerId={targetWorkerId} setTargetWorkerId={setTargetWorkerId} />
      )}

      {activeView === 'CHAT' && (
        <div className="p-4 text-muted-foreground flex flex-col items-center justify-center h-full text-center">
          <p>Contact List</p>
          <p className="text-xs mt-2">(Select a worker to chat for now)</p>
        </div>
      )}

      {activeView === 'DB_OPS' && (
        <div className="p-4 text-muted-foreground flex items-center justify-center h-full text-center">
          Database Operations Menu
        </div>
      )}

      {activeView === 'SETTINGS' && (
        <div className="p-4 text-muted-foreground flex items-center justify-center h-full text-center">
          Settings Menu
        </div>
      )}
    </div>
  );
};

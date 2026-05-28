import React from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { JobManager } from '../swarm/JobManager';

interface TelemetryDrawerProps {
  isConnected: boolean;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({ isConnected }) => {
  const { isTelemetryOpen, setTelemetryOpen } = useLayoutStore();

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-[#0d1117] border-t border-border flex flex-col transition-all duration-300 ease-in-out shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-30 ${
        isTelemetryOpen ? 'h-72' : 'h-10'
      }`}
    >
      {/* Drawer Handle / Header */}
      <div
        className="h-10 w-full flex items-center justify-between px-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-border/50"
        onClick={() => setTelemetryOpen(!isTelemetryOpen)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity size={16} className={isConnected ? 'text-primary' : 'text-destructive'} />
          Global Task Queue & Telemetry
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          {isTelemetryOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 p-4 overflow-y-auto">
           {/* We will embed the JobManager here, adapting it to fit the horizontal space */}
           {isTelemetryOpen && <JobManager isConnected={isConnected} />}
        </div>

        {/* Decorative Grid Background for that "Command Center" feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
      </div>
    </div>
  );
};

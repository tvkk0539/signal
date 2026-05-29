import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useLayoutStore } from '../../store/layoutStore';
import { AuthScreen } from '../auth/AuthScreen';
import { GlobalSidebar } from './GlobalSidebar';
import { TelemetryDrawer } from './TelemetryDrawer';
import { FileExplorer } from '../explorer/FileExplorer';
import { HorizontalFleetBar } from '../swarm/HorizontalFleetBar';
import { ChatBox } from '../chat/ChatBox';
import { DatabaseOperationsCenter } from '../db/DatabaseOperationsCenter';
import { SocketManager } from '../../worker/SocketManager';

// Use an array join for the placeholder so global search-and-replace in the Docker entrypoint
// doesn't accidentally replace this source code during compilation, and esbuild doesn't merge it.
const PLACEHOLDER = ['__VITE_RELAY_URL_', 'PLACEHOLDER__'].join('');
const RELAY_SERVER_URL = import.meta.env.VITE_RELAY_URL && import.meta.env.VITE_RELAY_URL !== PLACEHOLDER
  ? import.meta.env.VITE_RELAY_URL
  : 'http://localhost:3001';

export const IDELayout: React.FC = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { activeView } = useLayoutStore();

  const [isConnected, setIsConnected] = useState(false);
  const [targetWorkerId, setTargetWorkerId] = useState<string>('');

  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    socketManager.connect(RELAY_SERVER_URL, token);

    const handleConnected = () => console.log(`[UI] Socket connected to Relay.`);
    const handleAuthSuccess = () => {
       setIsConnected(true);
       console.log(`[UI] Authentication Successful! Ready to control swarm.`);
    };
    const handleAuthFailed = () => console.error(`[UI] Authentication Failed.`);
    const handleDisconnected = () => {
       setIsConnected(false);
       console.log(`[UI] Disconnected from Relay Server.`);
    };

    socketManager.on('SOCKET_CONNECTED', handleConnected);
    socketManager.on('AUTH_SUCCESS', handleAuthSuccess);
    socketManager.on('AUTH_FAILED', handleAuthFailed);
    socketManager.on('SOCKET_DISCONNECTED', handleDisconnected);

    return () => {
      socketManager.off('SOCKET_CONNECTED', handleConnected);
      socketManager.off('AUTH_SUCCESS', handleAuthSuccess);
      socketManager.off('AUTH_FAILED', handleAuthFailed);
      socketManager.off('SOCKET_DISCONNECTED', handleDisconnected);
      socketManager.disconnect();
    };
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">

      {/* 1. Global Navigation Sidebar (Far Left) */}
      <GlobalSidebar />

      {/* 2. Main Stage (Center Workspace) */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-[#0f1218]">

        {/* Top Status Bar */}
        <div className="h-12 border-b border-border bg-[#161b22] flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold tracking-wide text-sm text-foreground/90">Swarm Command Center</h1>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary shadow-[0_0_8px_rgba(170,59,255,0.8)]' : 'bg-destructive'}`} />
              <span className="text-muted-foreground">{isConnected ? 'Relay Active' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
             Workspace: {targetWorkerId || 'Global'}
          </div>
        </div>

        {/* Dynamic App View */}
        <div className="flex-1 overflow-hidden relative flex flex-col pb-16"> {/* pb-16 for TelemetryDrawer handle */}

          {activeView === 'EXPLORER' && (
            <div className="flex-1 flex flex-col h-full">
              <HorizontalFleetBar
                targetWorkerId={targetWorkerId}
                setTargetWorkerId={setTargetWorkerId}
                isConnected={isConnected}
              />
              <div className="flex-1 overflow-hidden p-6 pt-0">
                {targetWorkerId ? (
                  <FileExplorer isConnected={isConnected} workerId={targetWorkerId} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-card/20">
                    <div className="text-center text-muted-foreground">
                      <div className="text-4xl mb-4">🗄️</div>
                      <h2 className="text-lg font-medium text-foreground">No Target Selected</h2>
                      <p className="text-sm mt-2">Select an active node from the top fleet bar to browse files.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'CHAT' && (
            <div className="h-full w-full max-w-4xl mx-auto">
               <ChatBox targetId={targetWorkerId} isOnline={false} />
            </div>
          )}

          {activeView === 'DB_OPS' && (
            <div className="h-full w-full max-w-5xl mx-auto overflow-y-auto">
               {/* We will embed the full DatabaseOperationsCenter here instead of a floating modal */}
               <DatabaseOperationsCenter />
            </div>
          )}

        </div>

        {/* 4. Telemetry Drawer (Bottom) */}
        <TelemetryDrawer isConnected={isConnected} />

      </div>
    </div>
  );
};

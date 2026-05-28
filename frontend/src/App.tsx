import { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import { useAuthStore } from './store/authStore';
import { AuthScreen } from './components/auth/AuthScreen';
import { FileExplorer } from './components/explorer/FileExplorer';
import { FleetSidebar } from './components/swarm/FleetSidebar';
import { JobManager } from './components/swarm/JobManager';
import { ChatBox } from './components/chat/ChatBox';
import { SocketManager } from './worker/SocketManager';
import { DatabaseOperationsCenter } from './components/db/DatabaseOperationsCenter';
import './App.css';

// Use an array join for the placeholder so global search-and-replace in the Docker entrypoint
// doesn't accidentally replace this source code during compilation, and esbuild doesn't merge it.
const PLACEHOLDER = ['__VITE_RELAY_URL_', 'PLACEHOLDER__'].join('');
const RELAY_SERVER_URL = import.meta.env.VITE_RELAY_URL && import.meta.env.VITE_RELAY_URL !== PLACEHOLDER
  ? import.meta.env.VITE_RELAY_URL
  : 'http://localhost:3001';

function App() {
  const { token, user, isAuthenticated, logout } = useAuthStore();

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
    const handlePong = (data: { timestamp: number }) => {
       const latency = Date.now() - data.timestamp;
       console.log(`[UI] Received PONG from Relay Server (Latency: ${latency}ms)`);
    };

    socketManager.on('SOCKET_CONNECTED', handleConnected);
    socketManager.on('AUTH_SUCCESS', handleAuthSuccess);
    socketManager.on('AUTH_FAILED', handleAuthFailed);
    socketManager.on('SOCKET_DISCONNECTED', handleDisconnected);
    socketManager.on(MessageType.PONG, handlePong);

    return () => {
      socketManager.off('SOCKET_CONNECTED', handleConnected);
      socketManager.off('AUTH_SUCCESS', handleAuthSuccess);
      socketManager.off('AUTH_FAILED', handleAuthFailed);
      socketManager.off('SOCKET_DISCONNECTED', handleDisconnected);
      socketManager.off(MessageType.PONG, handlePong);
      socketManager.disconnect();
    };
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>

      {/* Sidebar: The Fleet Registry */}
      <FleetSidebar
        targetWorkerId={targetWorkerId}
        setTargetWorkerId={setTargetWorkerId}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top Navbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', backgroundColor: '#252526', color: 'white', borderBottom: '1px solid #333' }}>
           <div>
              <span style={{ fontSize: '20px', fontWeight: 'bold', marginRight: '20px' }}>Swarm Command Center</span>
              <span style={{ fontSize: '14px', color: isConnected ? '#2ecc71' : '#e74c3c' }}>
                {isConnected ? '● Connected to Relay' : '● Disconnected'}
              </span>
           </div>
           <div>
              <span style={{ marginRight: '20px', color: '#aaa' }}>Commander: {user?.email}</span>
              <button onClick={logout} style={{ background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
           </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {targetWorkerId ? (
              <>
                <div style={{ flex: 1 }}>
                  <FileExplorer
                    isConnected={isConnected}
                    workerId={targetWorkerId}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {/* Note: targetWorkerId is used for MVP Phase 3 to show the UI. In full prod, we'd select a targetUserId */}
                  <ChatBox targetId={targetWorkerId} isOnline={false} />
                </div>
              </>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                border: '2px dashed #444',
                borderRadius: '10px'
              }}>
                <h2>Select a Worker from the Fleet Sidebar to begin</h2>
              </div>
            )}
          </div>

          {/* Job Manager Sidebar */}
          <JobManager isConnected={isConnected} />
        </div>
      </div>
      <DatabaseOperationsCenter />
    </div>
  );
}

export default App;

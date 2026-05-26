import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { AuthRequestMessage } from '@swarm/shared';
import { useAuthStore } from './store/authStore';
import { AuthScreen } from './components/auth/AuthScreen';
import { FileExplorer } from './components/explorer/FileExplorer';
import { FleetSidebar } from './components/swarm/FleetSidebar';
import { JobManager } from './components/swarm/JobManager';
import { ChatBox } from './components/chat/ChatBox';
import './App.css';

const RELAY_SERVER_URL = 'http://localhost:3001';

function App() {
  const { token, user, isAuthenticated, logout } = useAuthStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [targetWorkerId, setTargetWorkerId] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    console.log(`[UI] Booting up. Connecting to Relay Server at ${RELAY_SERVER_URL}`);
    const newSocket = io(RELAY_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`[UI] Connected to Relay Server. Authenticating...`);

      const authMessage: AuthRequestMessage = {
        type: MessageType.AUTH_REQUEST,
        timestamp: Date.now(),
        role: 'UI',
        token: token
      };

      newSocket.emit(MessageType.AUTH_REQUEST, authMessage);
    });

    newSocket.on(MessageType.AUTH_RESPONSE, (res: { success: boolean }) => {
      if (res.success) {
        setIsConnected(true);
        console.log(`[UI] Authentication Successful! Ready to control swarm.`);
      }
    });

    newSocket.on(MessageType.PONG, (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      console.log(`[UI] Received PONG from Relay Server (Latency: ${latency}ms)`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log(`[UI] Disconnected from Relay Server.`);
    });

    return () => {
      newSocket.close();
    };
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>

      {/* Sidebar: The Fleet Registry */}
      <FleetSidebar
        socket={socket}
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
                    socket={socket}
                    isConnected={isConnected}
                    workerId={targetWorkerId}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {/* Note: targetWorkerId is used for MVP Phase 3 to show the UI. In full prod, we'd select a targetUserId */}
                  <ChatBox socket={socket} targetId={targetWorkerId} isOnline={false} />
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
          <JobManager socket={socket} isConnected={isConnected} />
        </div>
      </div>
    </div>
  );
}

export default App;

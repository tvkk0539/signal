import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { AuthRequestMessage } from '@swarm/shared';
import { useAuthStore } from './store/authStore';
import { AuthScreen } from './components/auth/AuthScreen';
import { FileExplorer } from './components/explorer/FileExplorer';
import './App.css';

const RELAY_SERVER_URL = 'http://localhost:3001';

function App() {
  const { token, user, isAuthenticated, logout } = useAuthStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pingData, setPingData] = useState<string>('');
  const [targetWorkerId, setTargetWorkerId] = useState<string>('');
  const [workerIdInput, setWorkerIdInput] = useState<string>('');

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
      setPingData(`Ping: ${latency}ms`);
      console.log(`[UI] Received PONG from Relay Server (Latency: ${latency}ms)`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log(`[UI] Disconnected from Relay Server.`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const pingSwarm = () => {
    if (socket && isConnected) {
      setPingData('Pinging...');
      socket.emit(MessageType.PING, { timestamp: Date.now() });
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleSetWorker = (e: React.FormEvent) => {
    e.preventDefault();
    setTargetWorkerId(workerIdInput);
  };

  return (
    <div className="App" style={{ textAlign: 'center', marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '10px', backgroundColor: '#eee', borderRadius: '8px' }}>
         <div>Commander: <strong>{user?.email}</strong></div>
         <button onClick={logout} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1200px' }}>
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', minWidth: '300px' }}>
          <h1>Swarm Command Center</h1>
          <div style={{ marginBottom: '20px' }}>
            <strong>Status: </strong>
            <span style={{ color: isConnected ? 'green' : 'red' }}>
              {isConnected ? 'Connected to Relay' : 'Disconnected'}
            </span>
          </div>

          <button
            onClick={pingSwarm}
            disabled={!isConnected}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: isConnected ? 'pointer' : 'not-allowed', marginBottom: '20px' }}
          >
            Ping Swarm
          </button>

          <div style={{ color: '#666', marginBottom: '20px' }}>
            {pingData}
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3>Target Worker</h3>
            <form onSubmit={handleSetWorker} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="Enter Worker Socket ID"
                value={workerIdInput}
                onChange={(e) => setWorkerIdInput(e.target.value)}
                style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>Set Worker</button>
            </form>
          </div>
        </div>

        {targetWorkerId ? (
           <FileExplorer
             socket={socket}
             isConnected={isConnected}
             workerId={targetWorkerId}
           />
        ) : (
          <div style={{ padding: '40px', border: '1px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', minWidth: '600px' }}>
            Enter a Worker ID to load the File Explorer
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

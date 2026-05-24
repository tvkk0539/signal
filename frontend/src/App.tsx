import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { AuthRequestMessage } from '@swarm/shared';
import './App.css';

const RELAY_SERVER_URL = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pingData, setPingData] = useState<string>('');

  useEffect(() => {
    console.log(`[UI] Booting up. Connecting to Relay Server at ${RELAY_SERVER_URL}`);
    const newSocket = io(RELAY_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`[UI] Connected to Relay Server. Authenticating...`);

      const authMessage: AuthRequestMessage = {
        type: MessageType.AUTH_REQUEST,
        timestamp: Date.now(),
        role: 'UI',
        token: 'UI_TOKEN_NOT_IMPLEMENTED_YET'
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

  return (
    <div className="App" style={{ textAlign: 'center', marginTop: '50px' }}>
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
        style={{ padding: '10px 20px', fontSize: '16px', cursor: isConnected ? 'pointer' : 'not-allowed' }}
      >
        Ping Swarm
      </button>

      <div style={{ marginTop: '20px', color: '#666' }}>
        {pingData}
      </div>
    </div>
  );
}

export default App;
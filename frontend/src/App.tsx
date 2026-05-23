import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';

// Initialize socket connection pointing to the backend
const socket: Socket = io('http://localhost:3001');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setMessages((prev) => [...prev, 'Connected to server']);
    }

    function onDisconnect() {
      setIsConnected(false);
      setMessages((prev) => [...prev, 'Disconnected from server']);
    }

    function onJobProgress(data: { progress: number; message: string }) {
      setProgress(data.progress);
      setMessages((prev) => [...prev, data.message]);
    }

    function onJobComplete(data: { message: string }) {
      setIsProcessing(false);
      setMessages((prev) => [...prev, data.message]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('job-progress', onJobProgress);
    socket.on('job-complete', onJobComplete);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('job-progress', onJobProgress);
      socket.off('job-complete', onJobComplete);
    };
  }, []);

  const startJob = () => {
    if (!isConnected || isProcessing) return;
    setIsProcessing(true);
    setProgress(0);
    setMessages((prev) => [...prev, 'Starting new job...']);
    socket.emit('start-job', { target: 'demo-task' });
  };

  return (
    <div className="App">
      <h1>Cloud Management Platform (MVP)</h1>

      <div className="status">
        <p>Backend Connection: <span style={{ color: isConnected ? 'green' : 'red' }}>{isConnected ? 'Online' : 'Offline'}</span></p>
      </div>

      <div className="controls">
        <button onClick={startJob} disabled={!isConnected || isProcessing}>
          {isProcessing ? 'Processing...' : 'Start Background Job'}
        </button>
      </div>

      {isProcessing && (
        <div className="progress-container" style={{ marginTop: '20px', width: '300px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
          <div
            className="progress-bar"
            style={{
              height: '20px',
              width: `${progress}%`,
              backgroundColor: '#4caf50',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}
          />
          <p>{progress}%</p>
        </div>
      )}

      <div className="logs" style={{ marginTop: '20px', textAlign: 'left', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', height: '200px', overflowY: 'auto' }}>
        <h3>Activity Log:</h3>
        <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

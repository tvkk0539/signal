import { io, Socket } from 'socket.io-client';
import { MessageType, AuthRequestMessage } from '@swarm/shared';

const RELAY_SERVER_URL = process.env.RELAY_URL || 'http://localhost:3001';
const WORKER_SECRET = process.env.WORKER_SECRET || 'fallback_for_dev_only';

console.log(`[Worker] Booting up. Attempting to connect to Relay Server at ${RELAY_SERVER_URL}`);

// Outbound connection to bypass firewalls
const socket: Socket = io(RELAY_SERVER_URL);

socket.on('connect', () => {
  console.log(`[Worker] Connected to Relay Server. Authenticating...`);

  const authMessage: AuthRequestMessage = {
    type: MessageType.AUTH_REQUEST,
    timestamp: Date.now(),
    role: 'WORKER',
    token: WORKER_SECRET
  };

  socket.emit(MessageType.AUTH_REQUEST, authMessage);
});

socket.on(MessageType.AUTH_RESPONSE, (res: { success: boolean }) => {
  if (res.success) {
    console.log(`[Worker] Authentication Successful! Ready to accept tasks.`);
  } else {
    console.error(`[Worker] Authentication Failed.`);
  }
});

socket.on(MessageType.PONG, (data: { timestamp: number }) => {
  console.log(`[Worker] Received PONG from Relay Server (Ping: ${Date.now() - data.timestamp}ms)`);
});

socket.on('disconnect', () => {
  console.log(`[Worker] Disconnected from Relay Server.`);
});
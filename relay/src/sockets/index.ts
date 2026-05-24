import { Server, Socket } from 'socket.io';
import { MessageType, AuthRequestMessage } from '@swarm/shared';

// Registry to track connected workers
export const connectedWorkers = new Map<string, Socket>();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Gatekeeper] New connection attempt: ${socket.id}`);

    // Wait for authentication before fully trusting the connection
    socket.on(MessageType.AUTH_REQUEST, (msg: AuthRequestMessage) => {
      console.log(`[Gatekeeper] Auth Request from ${msg.role}`);

      // Zero-Trust Concept: Hardcoded API Key check for workers
      if (msg.role === 'WORKER') {
        if (msg.token === 'SECRET_WORKER_KEY_123') {
           console.log(`[Fleet Admiral] Worker Authorized: ${socket.id}`);
           connectedWorkers.set(socket.id, socket);

           socket.emit(MessageType.AUTH_RESPONSE, { success: true });
        } else {
           console.log(`[Gatekeeper] Unauthorized worker connection dropped.`);
           socket.disconnect(true);
        }
      } else if (msg.role === 'UI') {
        console.log(`[Gatekeeper] UI Dashboard connected.`);
        socket.emit(MessageType.AUTH_RESPONSE, { success: true });
      }
    });

    socket.on('disconnect', () => {
      if (connectedWorkers.has(socket.id)) {
        console.log(`[Fleet Admiral] Worker Offline: ${socket.id}`);
        connectedWorkers.delete(socket.id);
      } else {
        console.log(`[Gatekeeper] Client disconnected: ${socket.id}`);
      }
    });

    // Ping/Pong capability test
    socket.on(MessageType.PING, () => {
       console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
       socket.emit(MessageType.PONG, { timestamp: Date.now() });
    });
  });
}
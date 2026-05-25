import { Server, Socket } from 'socket.io';
import { MessageType, AuthRequestMessage } from '@swarm/shared';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';

// Registry to track connected workers
export const connectedWorkers = new Map<string, Socket>();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Gatekeeper] New connection attempt: ${socket.id}`);

    // Wait for authentication before fully trusting the connection
    socket.on(MessageType.AUTH_REQUEST, (msg: AuthRequestMessage) => {
      console.log(`[Gatekeeper] Auth Request from ${msg.role}`);

      // Zero-Trust Concept: API Key check for workers via Env
      const expectedWorkerSecret = process.env.WORKER_SECRET || 'fallback_for_dev_only';
      if (msg.role === 'WORKER') {
        if (msg.token === expectedWorkerSecret) {
           console.log(`[Fleet Admiral] Worker Authorized: ${socket.id}`);
           connectedWorkers.set(socket.id, socket);

           socket.emit(MessageType.AUTH_RESPONSE, { success: true });
        } else {
           console.log(`[Gatekeeper] Unauthorized worker connection dropped.`);
           socket.disconnect(true);
        }
      } else if (msg.role === 'UI') {
        try {
          // Cryptographically verify the JWT sent by the frontend
          const decoded = jwt.verify(msg.token, JWT_SECRET);
          console.log(`[Gatekeeper] UI Dashboard Authorized for user: ${(decoded as any).email}`);
          socket.emit(MessageType.AUTH_RESPONSE, { success: true });
        } catch (err) {
          console.error(`[Gatekeeper] UI Authentication Failed. Invalid JWT.`);
          socket.disconnect(true);
        }
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
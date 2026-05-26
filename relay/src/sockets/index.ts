import { Server, Socket } from 'socket.io';
import { MessageType, AuthRequestMessage } from '@swarm/shared';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';

// Registry to track connected workers
export const connectedWorkers = new Map<string, Socket>();
export const connectedUIClients = new Map<string, Socket>();

let roundRobinIndex = 0;

function broadcastFleetState(io: Server) {
  const workers = Array.from(connectedWorkers.keys());
  io.emit(MessageType.FLEET_STATE_UPDATE, {
    type: MessageType.FLEET_STATE_UPDATE,
    timestamp: Date.now(),
    workers
  });
}

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
           broadcastFleetState(io); // Broadcast updated state
        } else {
           console.log(`[Gatekeeper] Unauthorized worker connection dropped.`);
           socket.disconnect(true);
        }
      } else if (msg.role === 'UI') {
        try {
          // Cryptographically verify the JWT sent by the frontend
          const decoded = jwt.verify(msg.token, JWT_SECRET);
          console.log(`[Gatekeeper] UI Dashboard Authorized for user: ${(decoded as any).email}`);
          connectedUIClients.set(socket.id, socket);
          socket.emit(MessageType.AUTH_RESPONSE, { success: true });

          // Send current state to newly connected UI client
          const workers = Array.from(connectedWorkers.keys());
          socket.emit(MessageType.FLEET_STATE_UPDATE, {
            type: MessageType.FLEET_STATE_UPDATE,
            timestamp: Date.now(),
            workers
          });
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
        broadcastFleetState(io); // Broadcast updated state
      } else if (connectedUIClients.has(socket.id)) {
        console.log(`[Gatekeeper] UI Client disconnected: ${socket.id}`);
        connectedUIClients.delete(socket.id);
      } else {
        console.log(`[Gatekeeper] Client disconnected: ${socket.id}`);
      }
    });

    // P2P/UI-to-Worker Message Routing
    socket.on(MessageType.FILE_LIST_REQUEST, (msg: any) => {
      const workerSocket = connectedWorkers.get(msg.workerId);
      if (workerSocket) {
        workerSocket.emit(MessageType.FILE_LIST_REQUEST, msg);
      }
    });

    socket.on(MessageType.FILE_LIST_RESPONSE, (msg: any) => {
      // Broadcast to UI clients (can be optimized to targeted clients later)
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.FILE_LIST_RESPONSE, msg);
      });
    });

    socket.on(MessageType.REMOTE_LIST_REQUEST, (msg: any) => {
      const workerSocket = connectedWorkers.get(msg.workerId);
      if (workerSocket) {
        workerSocket.emit(MessageType.REMOTE_LIST_REQUEST, msg);
      }
    });

    socket.on(MessageType.REMOTE_LIST_RESPONSE, (msg: any) => {
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.REMOTE_LIST_RESPONSE, msg);
      });
    });

    // Global Task Queue: Round-Robin Load Balancing
    socket.on(MessageType.BATCH_TASK_REQUEST, (msg: any) => {
      const workers = Array.from(connectedWorkers.values());
      if (workers.length === 0) {
        console.log(`[Fleet Admiral] No workers available to handle BATCH_TASK_REQUEST`);
        return;
      }

      console.log(`[Fleet Admiral] Distributing ${msg.tasks.length} tasks to ${workers.length} workers...`);

      msg.tasks.forEach((task: any) => {
        const worker = workers[roundRobinIndex % workers.length];
        worker.emit(MessageType.TASK_ASSIGNMENT, {
          type: MessageType.TASK_ASSIGNMENT,
          timestamp: Date.now(),
          taskId: task.id,
          taskType: task.action,
          payload: task.payload
        });
        roundRobinIndex++;
      });
    });

    socket.on(MessageType.TASK_PROGRESS, (msg: any) => {
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.TASK_PROGRESS, msg);
      });
    });

    // Ping/Pong capability test
    socket.on(MessageType.PING, () => {
       console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
       socket.emit(MessageType.PONG, { timestamp: Date.now() });
    });
  });
}
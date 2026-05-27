import { Server, Socket } from 'socket.io';
import { MessageType, AuthRequestMessage } from '@swarm/shared';
import jwt from 'jsonwebtoken';
import { dbManager } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';

// Registry to track connected workers and their gRPC configurations
interface WorkerData {
  socket: Socket;
  grpcPort?: number;
  ipAddress: string;
}

export const connectedWorkers = new Map<string, WorkerData>();
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
           console.log(`[Fleet Admiral] Worker Authorized: ${socket.id} (gRPC Port: ${msg.grpcPort || 'None'})`);

           // Extract remote IP (accounting for proxies if deployed)
           const ipAddress = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '127.0.0.1';

           connectedWorkers.set(socket.id, {
             socket: socket,
             grpcPort: msg.grpcPort,
             ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0] : ipAddress[0]
           });

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
      const workerData = connectedWorkers.get(msg.workerId);
      if (workerData) {
        workerData.socket.emit(MessageType.FILE_LIST_REQUEST, msg);
      }
    });

    socket.on(MessageType.FILE_LIST_RESPONSE, (msg: any) => {
      // Broadcast to UI clients (can be optimized to targeted clients later)
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.FILE_LIST_RESPONSE, msg);
      });
    });

    socket.on(MessageType.REMOTE_LIST_REQUEST, (msg: any) => {
      const workerData = connectedWorkers.get(msg.workerId);
      if (workerData) {
        workerData.socket.emit(MessageType.REMOTE_LIST_REQUEST, msg);
      }
    });

    socket.on(MessageType.REMOTE_LIST_RESPONSE, (msg: any) => {
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.REMOTE_LIST_RESPONSE, msg);
      });
    });

    // --- Phase 3: Chat Router & WebRTC Matchmaker ---

    // Chat Message Routing
    socket.on(MessageType.CHAT_MESSAGE, (msg: any) => {
      // In a real implementation, we would map User IDs to Socket IDs using a robust registry.
      // For MVP, we route directly if we can find the socket by ID, or broadcast it
      // (which the client will filter based on targetId).
      const targetSocket = connectedUIClients.get(msg.targetId);
      if (targetSocket) {
        targetSocket.emit(MessageType.CHAT_MESSAGE, msg);
        // Optionally send a delivery receipt back to sender
        socket.emit(MessageType.CHAT_MESSAGE_DELIVERED, {
          type: MessageType.CHAT_MESSAGE_DELIVERED,
          timestamp: Date.now(),
          messageId: msg.timestamp.toString(), // Using timestamp as simple ID
          targetId: msg.targetId
        });
      } else {
        // If the target is not currently connected via UI, route it to a Worker for offline storage handoff
        const workers = Array.from(connectedWorkers.values());
        if (workers.length > 0) {
           const workerData = workers[roundRobinIndex % workers.length];
           // In full production, this would trigger a specific DB insert job.
           console.log(`[Chat Router] Target offline. Delegating to Worker ${workerData.socket.id} for storage.`);
           roundRobinIndex++;
        }
      }
    });

    // Cloud Handoff (Offline File Upload Routing)
    socket.on(MessageType.OFFLINE_FILE_UPLOAD_REQUEST, (msg: any) => {
      const workers = Array.from(connectedWorkers.values());
      if (workers.length > 0) {
        const workerData = workers[roundRobinIndex % workers.length];
        console.log(`[Relay] Routing OFFLINE_FILE_UPLOAD_REQUEST for ${msg.fileName} to Worker ${workerData.socket.id}`);
        workerData.socket.emit(MessageType.OFFLINE_FILE_UPLOAD_REQUEST, msg);
        roundRobinIndex++;
      } else {
        console.error(`[Relay] No workers available for offline file upload handoff.`);
      }
    });

    // WebRTC Signaling Matchmaker
    socket.on(MessageType.SDP_OFFER, (msg: any) => {
      console.log(`[Matchmaker] Routing SDP_OFFER from ${msg.senderId} to ${msg.targetId}`);
      const targetSocket = connectedUIClients.get(msg.targetId) || connectedWorkers.get(msg.targetId)?.socket;
      if (targetSocket) {
        targetSocket.emit(MessageType.SDP_OFFER, msg);
      }
    });

    socket.on(MessageType.SDP_ANSWER, (msg: any) => {
      console.log(`[Matchmaker] Routing SDP_ANSWER from ${msg.senderId} to ${msg.targetId}`);
      const targetSocket = connectedUIClients.get(msg.targetId) || connectedWorkers.get(msg.targetId)?.socket;
      if (targetSocket) {
        targetSocket.emit(MessageType.SDP_ANSWER, msg);
      }
    });

    socket.on(MessageType.ICE_CANDIDATE, (msg: any) => {
      const targetSocket = connectedUIClients.get(msg.targetId) || connectedWorkers.get(msg.targetId)?.socket;
      if (targetSocket) {
        targetSocket.emit(MessageType.ICE_CANDIDATE, msg);
      }
    });

    // Phase 5: gRPC Service Discovery (DNS Router)
    socket.on(MessageType.GRPC_DISCOVERY_REQUEST, (msg: any) => {
      console.log(`[Service Discovery] Worker ${socket.id} looking up gRPC address for ${msg.targetWorkerId}`);
      const targetData = connectedWorkers.get(msg.targetWorkerId);

      if (targetData && targetData.grpcPort) {
        socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
          type: MessageType.GRPC_DISCOVERY_RESPONSE,
          timestamp: Date.now(),
          targetWorkerId: msg.targetWorkerId,
          ipAddress: targetData.ipAddress,
          grpcPort: targetData.grpcPort
        });
      } else {
        socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
          type: MessageType.GRPC_DISCOVERY_RESPONSE,
          timestamp: Date.now(),
          targetWorkerId: msg.targetWorkerId,
          error: "Worker offline or gRPC port not registered"
        });
      }
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
        const workerData = workers[roundRobinIndex % workers.length];
        workerData.socket.emit(MessageType.TASK_ASSIGNMENT, {
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
      // Broadcast to UI
      connectedUIClients.forEach((clientSocket) => {
        clientSocket.emit(MessageType.TASK_PROGRESS, msg);
      });

      // Audit Logging for completed tasks
      if (msg.status === 'COMPLETE' || msg.status === 'gRPC TRANSFER COMPLETE' || msg.progress === 100) {
        console.log(`[Audit Logger] Logging completed task ${msg.taskId} for worker ${msg.workerId}`);
        dbManager.getAuditLogs().createLog({
          jobId: msg.taskId,
          workerId: msg.workerId,
          action: msg.status === 'gRPC TRANSFER COMPLETE' ? 'gRPC_TRANSFER' : 'TASK',
          status: 'SUCCESS',
          timestamp: new Date()
        }).catch(err => {
          console.error(`[Audit Logger] Failed to save audit log for task ${msg.taskId}`, err);
        });
      } else if (msg.status === 'FAILED' || msg.status === 'ERROR') {
        dbManager.getAuditLogs().createLog({
          jobId: msg.taskId,
          workerId: msg.workerId,
          action: 'TASK',
          status: 'FAILED',
          timestamp: new Date()
        }).catch(err => {
          console.error(`[Audit Logger] Failed to save audit log for task ${msg.taskId}`, err);
        });
      }
    });

    // Ping/Pong capability test
    socket.on(MessageType.PING, () => {
       console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
       socket.emit(MessageType.PONG, { timestamp: Date.now() });
    });
  });
}
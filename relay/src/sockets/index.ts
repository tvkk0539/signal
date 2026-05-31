import { Server, Socket } from 'socket.io';
import { MessageType, AuthRequestMessage } from '@swarm/shared';
import jwt from 'jsonwebtoken';
import { dbManager } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';

import { GrpcRelayRouter } from '../grpc/router';

// Global router instance
export const grpcRouter = new GrpcRelayRouter();

// Start the gRPC Relay Router when sockets are setup
grpcRouter.start().catch(e => console.error("Failed to start gRPC Relay Router:", e));

// Registry to track connected workers and their gRPC configurations
interface WorkerData {
  socket: Socket;
  grpcPort?: number;
  ipAddress: string;
  grpcMode?: 'DIRECT' | 'RELAY';
}

export const connectedWorkers = new Map<string, WorkerData>();
export const connectedUIClients = new Map<string, Socket>(); // Maps socket.id to Socket
export const uiUserSocketMap = new Map<string, string>();    // Maps userId to socket.id

// Public Key Directory for E2EE (User ID -> Base64 Public Key)
export const publicKeyRegistry = new Map<string, string>();

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
             ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0] : ipAddress[0],
             grpcMode: msg.grpcMode || 'DIRECT' // Default to DIRECT if not specified
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
          const userId = (decoded as any).id;
          console.log(`[Gatekeeper] UI Dashboard Authorized for user: ${(decoded as any).email} (ID: ${userId})`);

          connectedUIClients.set(socket.id, socket);
          uiUserSocketMap.set(userId, socket.id);

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

        // Clean up user mapping
        for (const [userId, sockId] of uiUserSocketMap.entries()) {
           if (sockId === socket.id) {
              uiUserSocketMap.delete(userId);
              break;
           }
        }
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

    // Helper to get socket by UI User ID or Worker ID
    const getTargetSocket = (targetId: string): Socket | undefined => {
       const workerData = connectedWorkers.get(targetId);
       if (workerData) return workerData.socket;

       const uiSocketId = uiUserSocketMap.get(targetId);
       if (uiSocketId) return connectedUIClients.get(uiSocketId);

       return undefined;
    };

    // Chat Message Routing
    socket.on(MessageType.CHAT_MESSAGE, (msg: any) => {
      const targetSocket = getTargetSocket(msg.targetId);
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
      const targetSocket = getTargetSocket(msg.targetId);
      if (targetSocket) {
        targetSocket.emit(MessageType.SDP_OFFER, msg);
      } else {
        console.error(`[Matchmaker] Target ${msg.targetId} not found for SDP_OFFER`);
      }
    });

    socket.on(MessageType.SDP_ANSWER, (msg: any) => {
      console.log(`[Matchmaker] Routing SDP_ANSWER from ${msg.senderId} to ${msg.targetId}`);
      const targetSocket = getTargetSocket(msg.targetId);
      if (targetSocket) {
        targetSocket.emit(MessageType.SDP_ANSWER, msg);
      } else {
        console.error(`[Matchmaker] Target ${msg.targetId} not found for SDP_ANSWER`);
      }
    });

    socket.on(MessageType.ICE_CANDIDATE, (msg: any) => {
      const targetSocket = getTargetSocket(msg.targetId);
      if (targetSocket) {
        targetSocket.emit(MessageType.ICE_CANDIDATE, msg);
      }
    });

    // Phase 5.5: Dual-Mode gRPC Service Discovery ("Traffic Cop" Router)
    socket.on(MessageType.GRPC_DISCOVERY_REQUEST, (msg: any) => {
      console.log(`[Service Discovery] Worker ${socket.id} looking up gRPC address for ${msg.targetWorkerId}`);
      const targetData = connectedWorkers.get(msg.targetWorkerId);

      if (!targetData) {
        socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
          type: MessageType.GRPC_DISCOVERY_RESPONSE,
          timestamp: Date.now(),
          targetWorkerId: msg.targetWorkerId,
          error: "Worker offline"
        });
        return;
      }

      if (targetData.grpcMode === 'RELAY') {
         // The target is behind a firewall. Route traffic through the Relay Server.
         console.log(`[Traffic Cop] Target Worker ${msg.targetWorkerId} is RELAY mode. Creating Reverse-Tunnel...`);

         const transferId = grpcRouter.createTransferSession();
         const relayIp = grpcRouter.getIp();
         const relayPort = grpcRouter.getPort();

         // 1. Tell Target Worker to establish outbound connection to Relay and wait for data
         targetData.socket.emit(MessageType.GRPC_RELAY_TRANSFER_READY, {
           type: MessageType.GRPC_RELAY_TRANSFER_READY,
           timestamp: Date.now(),
           transferId: transferId,
           relayGrpcIp: relayIp,
           relayGrpcPort: relayPort
         });

         // 2. Tell Source Worker to stream data to Relay
         socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
           type: MessageType.GRPC_DISCOVERY_RESPONSE,
           timestamp: Date.now(),
           targetWorkerId: msg.targetWorkerId,
           ipAddress: relayIp,
           grpcPort: relayPort,
           routingMode: 'RELAYED',
           transferId: transferId
         });

      } else {
         // The target has an open port. Instruct source to connect directly.
         if (targetData.grpcPort) {
             console.log(`[Traffic Cop] Target Worker ${msg.targetWorkerId} is DIRECT mode. Routing directly.`);
             socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
               type: MessageType.GRPC_DISCOVERY_RESPONSE,
               timestamp: Date.now(),
               targetWorkerId: msg.targetWorkerId,
               ipAddress: targetData.ipAddress,
               grpcPort: targetData.grpcPort,
               routingMode: 'DIRECT'
             });
         } else {
             socket.emit(MessageType.GRPC_DISCOVERY_RESPONSE, {
               type: MessageType.GRPC_DISCOVERY_RESPONSE,
               timestamp: Date.now(),
               targetWorkerId: msg.targetWorkerId,
               error: "Target worker has no gRPC port registered"
             });
         }
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

    // --- Phase 9: Media Ingestion Routing ---
    // The UI doesn't know which worker to talk to initially, so it sends the request here.
    // The Relay load-balances it to an idle worker.

    const routeToIdleWorker = (messageType: string, msg: any) => {
       const workers = Array.from(connectedWorkers.values());
       if (workers.length === 0) {
           console.log(`[Relay] No online workers available to handle ${messageType}.`);
           return;
       }
       // Select first idle worker (or round robin)
       const targetWorker = workers[0];
       targetWorker.socket.emit(messageType, { ...msg, workerId: targetWorker.socket.id });
       console.log(`[Relay] Routed ${messageType} to Worker ${targetWorker.socket.id}`);
    };

    socket.on(MessageType.WRAPPER_START_REQUEST, (msg: any) => routeToIdleWorker(MessageType.WRAPPER_START_REQUEST, msg));
    socket.on(MessageType.WRAPPER_STOP_REQUEST, (msg: any) => routeToIdleWorker(MessageType.WRAPPER_STOP_REQUEST, msg));
    socket.on(MessageType.WRAPPER_2FA_SUBMIT, (msg: any) => routeToIdleWorker(MessageType.WRAPPER_2FA_SUBMIT, msg));
    socket.on(MessageType.APPLE_MUSIC_RIP_REQUEST, (msg: any) => routeToIdleWorker(MessageType.APPLE_MUSIC_RIP_REQUEST, msg));

    // --- Phase 9 & 10: Media Config Database Routing ---
    socket.on(MessageType.APPLE_MUSIC_CONFIG_SAVE, async (msg: any) => {
        try {
            const db = dbManager.getAppleMusic();
            await db.saveConfig({
                mediaUserToken: msg.mediaUserToken,
                storefront: msg.storefront,
                alacFix: msg.alacFix,
                autoUpload: msg.autoUpload,
                rcloneRemote: msg.rcloneRemote,
                lrcFormat: msg.lrcFormat,
                lrcType: msg.lrcType,
                language: msg.language,
                tagSortOrder: msg.tagSortOrder,
                saveLrcFile: msg.saveLrcFile,
                saveArtistCover: msg.saveArtistCover,
                useSongInfoForPlaylist: msg.useSongInfoForPlaylist
            });
            console.log(`[Relay] Saved Apple Music Config for Swarm.`);
            // Broadcast config to all other UI clients to keep them in sync
            socket.broadcast.emit(MessageType.APPLE_MUSIC_CONFIG_DATA, {
               type: MessageType.APPLE_MUSIC_CONFIG_DATA,
               ...msg
            });
        } catch (e: any) {
            console.error(`[Relay] Failed to save Apple Music Config:`, e.message);
        }
    });

    socket.on(MessageType.APPLE_MUSIC_CONFIG_LOAD, async () => {
        try {
            const db = dbManager.getAppleMusic();
            const config = await db.getConfig();
            if (config) {
                socket.emit(MessageType.APPLE_MUSIC_CONFIG_DATA, {
                    type: MessageType.APPLE_MUSIC_CONFIG_DATA,
                    timestamp: Date.now(),
                    mediaUserToken: config.mediaUserToken,
                    storefront: config.storefront,
                    alacFix: config.alacFix,
                    autoUpload: config.autoUpload,
                    rcloneRemote: config.rcloneRemote,
                    lrcFormat: config.lrcFormat,
                    lrcType: config.lrcType,
                    language: config.language,
                    tagSortOrder: config.tagSortOrder,
                    saveLrcFile: config.saveLrcFile,
                    saveArtistCover: config.saveArtistCover,
                    useSongInfoForPlaylist: config.useSongInfoForPlaylist
                });
            }
        } catch (e: any) {
             console.error(`[Relay] Failed to load Apple Music Config:`, e.message);
        }
    });

    socket.on(MessageType.WRAPPER_STATE_SAVE, async (msg: any) => {
        try {
            const db = dbManager.getAppleMusic();
            await db.saveConfig({
                wrapperStatePayload: msg.payload
            });
            console.log(`[Relay] Ephemeral Wrapper State Saved (Length: ${msg.payload.length})`);
        } catch (e: any) {
            console.error(`[Relay] Failed to save Wrapper State:`, e.message);
        }
    });

    socket.on(MessageType.WRAPPER_STATE_LOAD, async (msg: any) => {
        try {
            const db = dbManager.getAppleMusic();
            const config = await db.getConfig();
            if (config && config.wrapperStatePayload) {
                console.log(`[Relay] Sending Hydration State to Worker ${socket.id}`);
                socket.emit(MessageType.WRAPPER_STATE_DATA, {
                    type: MessageType.WRAPPER_STATE_DATA,
                    payload: config.wrapperStatePayload,
                    workerId: msg.workerId
                });
            } else {
                console.log(`[Relay] No state found to hydrate for Worker ${socket.id}`);
                socket.emit(MessageType.WRAPPER_STATE_DATA, {
                    type: MessageType.WRAPPER_STATE_DATA,
                    payload: null,
                    workerId: msg.workerId
                });
            }
        } catch (e: any) {
            console.error(`[Relay] Failed to load Wrapper State:`, e.message);
            socket.emit(MessageType.WRAPPER_STATE_DATA, {
                type: MessageType.WRAPPER_STATE_DATA,
                payload: null,
                workerId: msg.workerId
            });
        }
    });

    // Reverse Routing: From Worker back to UI clients
    socket.on(MessageType.WRAPPER_STATUS_UPDATE, (msg: any) => {
        connectedUIClients.forEach((clientSocket) => {
            clientSocket.emit(MessageType.WRAPPER_STATUS_UPDATE, msg);
        });
    });

    socket.on(MessageType.WRAPPER_2FA_CHALLENGE, (msg: any) => {
        connectedUIClients.forEach((clientSocket) => {
            clientSocket.emit(MessageType.WRAPPER_2FA_CHALLENGE, msg);
        });
    });

    socket.on(MessageType.RIPPER_TELEMETRY, (msg: any) => {
        connectedUIClients.forEach((clientSocket) => {
            clientSocket.emit(MessageType.RIPPER_TELEMETRY, msg);
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

    // --- Database Operations Center API ---
    socket.on(MessageType.DB_STATE_REQUEST, () => {
       socket.emit(MessageType.DB_STATE_UPDATE, {
         type: MessageType.DB_STATE_UPDATE,
         timestamp: Date.now(),
         routing: dbManager.getRoutingState()
       });
    });

    socket.on(MessageType.DB_ROUTE_SWITCH_REQUEST, async (msg: any) => {
       console.log(`[DB Operations] Received request to route ${msg.domain} to ${msg.engine} with ${msg.mirrors?.length || 0} mirrors`);
       try {
         // UI payload mapping to DomainRoutingConfig
         const config = {
           primary: {
             engine: msg.engine,
             connectionString: msg.connectionString,
             apiKey: msg.apiKey
           },
           mirrors: msg.mirrors || []
         };

         await dbManager.hotSwapDomain(msg.domain, config);

         // Broadcast new state to all connected UI clients
         connectedUIClients.forEach((clientSocket) => {
           clientSocket.emit(MessageType.DB_STATE_UPDATE, {
             type: MessageType.DB_STATE_UPDATE,
             timestamp: Date.now(),
             routing: dbManager.getRoutingState()
           });
         });
       } catch (e: any) {
         console.error(`[DB Operations] Hot-swap failed:`, e.message);
         // Alert the specific UI client that failed
         socket.emit('error', { message: `Hot-swap failed: ${e.message}` });
       }
    });

    // --- ECDH Public Key Directory API ---
    socket.on(MessageType.PUBLIC_KEY_ANNOUNCE, (msg: any) => {
       console.log(`[E2EE Registry] Storing Public Key for User: ${msg.userId}`);
       publicKeyRegistry.set(msg.userId, msg.publicKeyBase64);
    });

    socket.on(MessageType.PUBLIC_KEY_REQUEST, (msg: any) => {
       const key = publicKeyRegistry.get(msg.targetId);
       socket.emit(MessageType.PUBLIC_KEY_RESPONSE, {
         type: MessageType.PUBLIC_KEY_RESPONSE,
         timestamp: Date.now(),
         targetId: msg.targetId,
         publicKeyBase64: key || null
       });
    });

    // Ping/Pong capability test
    socket.on(MessageType.PING, () => {
       console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
       socket.emit(MessageType.PONG, { timestamp: Date.now() });
    });
  });
}
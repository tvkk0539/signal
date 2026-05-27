"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectedUIClients = exports.connectedWorkers = void 0;
exports.setupSockets = setupSockets;
const shared_1 = require("@swarm/shared");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';
exports.connectedWorkers = new Map();
exports.connectedUIClients = new Map();
let roundRobinIndex = 0;
function broadcastFleetState(io) {
    const workers = Array.from(exports.connectedWorkers.keys());
    io.emit(shared_1.MessageType.FLEET_STATE_UPDATE, {
        type: shared_1.MessageType.FLEET_STATE_UPDATE,
        timestamp: Date.now(),
        workers
    });
}
function setupSockets(io) {
    io.on('connection', (socket) => {
        console.log(`[Gatekeeper] New connection attempt: ${socket.id}`);
        // Wait for authentication before fully trusting the connection
        socket.on(shared_1.MessageType.AUTH_REQUEST, (msg) => {
            console.log(`[Gatekeeper] Auth Request from ${msg.role}`);
            // Zero-Trust Concept: API Key check for workers via Env
            const expectedWorkerSecret = process.env.WORKER_SECRET || 'fallback_for_dev_only';
            if (msg.role === 'WORKER') {
                if (msg.token === expectedWorkerSecret) {
                    console.log(`[Fleet Admiral] Worker Authorized: ${socket.id} (gRPC Port: ${msg.grpcPort || 'None'})`);
                    // Extract remote IP (accounting for proxies if deployed)
                    const ipAddress = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '127.0.0.1';
                    exports.connectedWorkers.set(socket.id, {
                        socket: socket,
                        grpcPort: msg.grpcPort,
                        ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0] : ipAddress[0]
                    });
                    socket.emit(shared_1.MessageType.AUTH_RESPONSE, { success: true });
                    broadcastFleetState(io); // Broadcast updated state
                }
                else {
                    console.log(`[Gatekeeper] Unauthorized worker connection dropped.`);
                    socket.disconnect(true);
                }
            }
            else if (msg.role === 'UI') {
                try {
                    // Cryptographically verify the JWT sent by the frontend
                    const decoded = jsonwebtoken_1.default.verify(msg.token, JWT_SECRET);
                    console.log(`[Gatekeeper] UI Dashboard Authorized for user: ${decoded.email}`);
                    exports.connectedUIClients.set(socket.id, socket);
                    socket.emit(shared_1.MessageType.AUTH_RESPONSE, { success: true });
                    // Send current state to newly connected UI client
                    const workers = Array.from(exports.connectedWorkers.keys());
                    socket.emit(shared_1.MessageType.FLEET_STATE_UPDATE, {
                        type: shared_1.MessageType.FLEET_STATE_UPDATE,
                        timestamp: Date.now(),
                        workers
                    });
                }
                catch (err) {
                    console.error(`[Gatekeeper] UI Authentication Failed. Invalid JWT.`);
                    socket.disconnect(true);
                }
            }
        });
        socket.on('disconnect', () => {
            if (exports.connectedWorkers.has(socket.id)) {
                console.log(`[Fleet Admiral] Worker Offline: ${socket.id}`);
                exports.connectedWorkers.delete(socket.id);
                broadcastFleetState(io); // Broadcast updated state
            }
            else if (exports.connectedUIClients.has(socket.id)) {
                console.log(`[Gatekeeper] UI Client disconnected: ${socket.id}`);
                exports.connectedUIClients.delete(socket.id);
            }
            else {
                console.log(`[Gatekeeper] Client disconnected: ${socket.id}`);
            }
        });
        // P2P/UI-to-Worker Message Routing
        socket.on(shared_1.MessageType.FILE_LIST_REQUEST, (msg) => {
            const workerData = exports.connectedWorkers.get(msg.workerId);
            if (workerData) {
                workerData.socket.emit(shared_1.MessageType.FILE_LIST_REQUEST, msg);
            }
        });
        socket.on(shared_1.MessageType.FILE_LIST_RESPONSE, (msg) => {
            // Broadcast to UI clients (can be optimized to targeted clients later)
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.FILE_LIST_RESPONSE, msg);
            });
        });
        socket.on(shared_1.MessageType.REMOTE_LIST_REQUEST, (msg) => {
            const workerData = exports.connectedWorkers.get(msg.workerId);
            if (workerData) {
                workerData.socket.emit(shared_1.MessageType.REMOTE_LIST_REQUEST, msg);
            }
        });
        socket.on(shared_1.MessageType.REMOTE_LIST_RESPONSE, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.REMOTE_LIST_RESPONSE, msg);
            });
        });
        // --- Phase 3: Chat Router & WebRTC Matchmaker ---
        // Chat Message Routing
        socket.on(shared_1.MessageType.CHAT_MESSAGE, (msg) => {
            // In a real implementation, we would map User IDs to Socket IDs using a robust registry.
            // For MVP, we route directly if we can find the socket by ID, or broadcast it
            // (which the client will filter based on targetId).
            const targetSocket = exports.connectedUIClients.get(msg.targetId);
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.CHAT_MESSAGE, msg);
                // Optionally send a delivery receipt back to sender
                socket.emit(shared_1.MessageType.CHAT_MESSAGE_DELIVERED, {
                    type: shared_1.MessageType.CHAT_MESSAGE_DELIVERED,
                    timestamp: Date.now(),
                    messageId: msg.timestamp.toString(), // Using timestamp as simple ID
                    targetId: msg.targetId
                });
            }
            else {
                // If the target is not currently connected via UI, route it to a Worker for offline storage handoff
                const workers = Array.from(exports.connectedWorkers.values());
                if (workers.length > 0) {
                    const workerData = workers[roundRobinIndex % workers.length];
                    // In full production, this would trigger a specific DB insert job.
                    console.log(`[Chat Router] Target offline. Delegating to Worker ${workerData.socket.id} for storage.`);
                    roundRobinIndex++;
                }
            }
        });
        // Cloud Handoff (Offline File Upload Routing)
        socket.on(shared_1.MessageType.OFFLINE_FILE_UPLOAD_REQUEST, (msg) => {
            const workers = Array.from(exports.connectedWorkers.values());
            if (workers.length > 0) {
                const workerData = workers[roundRobinIndex % workers.length];
                console.log(`[Relay] Routing OFFLINE_FILE_UPLOAD_REQUEST for ${msg.fileName} to Worker ${workerData.socket.id}`);
                workerData.socket.emit(shared_1.MessageType.OFFLINE_FILE_UPLOAD_REQUEST, msg);
                roundRobinIndex++;
            }
            else {
                console.error(`[Relay] No workers available for offline file upload handoff.`);
            }
        });
        // WebRTC Signaling Matchmaker
        socket.on(shared_1.MessageType.SDP_OFFER, (msg) => {
            console.log(`[Matchmaker] Routing SDP_OFFER from ${msg.senderId} to ${msg.targetId}`);
            const targetSocket = exports.connectedUIClients.get(msg.targetId) || exports.connectedWorkers.get(msg.targetId)?.socket;
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.SDP_OFFER, msg);
            }
        });
        socket.on(shared_1.MessageType.SDP_ANSWER, (msg) => {
            console.log(`[Matchmaker] Routing SDP_ANSWER from ${msg.senderId} to ${msg.targetId}`);
            const targetSocket = exports.connectedUIClients.get(msg.targetId) || exports.connectedWorkers.get(msg.targetId)?.socket;
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.SDP_ANSWER, msg);
            }
        });
        socket.on(shared_1.MessageType.ICE_CANDIDATE, (msg) => {
            const targetSocket = exports.connectedUIClients.get(msg.targetId) || exports.connectedWorkers.get(msg.targetId)?.socket;
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.ICE_CANDIDATE, msg);
            }
        });
        // Phase 5: gRPC Service Discovery (DNS Router)
        socket.on(shared_1.MessageType.GRPC_DISCOVERY_REQUEST, (msg) => {
            console.log(`[Service Discovery] Worker ${socket.id} looking up gRPC address for ${msg.targetWorkerId}`);
            const targetData = exports.connectedWorkers.get(msg.targetWorkerId);
            if (targetData && targetData.grpcPort) {
                socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                    type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                    timestamp: Date.now(),
                    targetWorkerId: msg.targetWorkerId,
                    ipAddress: targetData.ipAddress,
                    grpcPort: targetData.grpcPort
                });
            }
            else {
                socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                    type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                    timestamp: Date.now(),
                    targetWorkerId: msg.targetWorkerId,
                    error: "Worker offline or gRPC port not registered"
                });
            }
        });
        // Global Task Queue: Round-Robin Load Balancing
        socket.on(shared_1.MessageType.BATCH_TASK_REQUEST, (msg) => {
            const workers = Array.from(exports.connectedWorkers.values());
            if (workers.length === 0) {
                console.log(`[Fleet Admiral] No workers available to handle BATCH_TASK_REQUEST`);
                return;
            }
            console.log(`[Fleet Admiral] Distributing ${msg.tasks.length} tasks to ${workers.length} workers...`);
            msg.tasks.forEach((task) => {
                const workerData = workers[roundRobinIndex % workers.length];
                workerData.socket.emit(shared_1.MessageType.TASK_ASSIGNMENT, {
                    type: shared_1.MessageType.TASK_ASSIGNMENT,
                    timestamp: Date.now(),
                    taskId: task.id,
                    taskType: task.action,
                    payload: task.payload
                });
                roundRobinIndex++;
            });
        });
        socket.on(shared_1.MessageType.TASK_PROGRESS, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.TASK_PROGRESS, msg);
            });
        });
        // Ping/Pong capability test
        socket.on(shared_1.MessageType.PING, () => {
            console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
            socket.emit(shared_1.MessageType.PONG, { timestamp: Date.now() });
        });
    });
}

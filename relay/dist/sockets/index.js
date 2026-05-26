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
// Registry to track connected workers
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
                    console.log(`[Fleet Admiral] Worker Authorized: ${socket.id}`);
                    exports.connectedWorkers.set(socket.id, socket);
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
            const workerSocket = exports.connectedWorkers.get(msg.workerId);
            if (workerSocket) {
                workerSocket.emit(shared_1.MessageType.FILE_LIST_REQUEST, msg);
            }
        });
        socket.on(shared_1.MessageType.FILE_LIST_RESPONSE, (msg) => {
            // Broadcast to UI clients (can be optimized to targeted clients later)
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.FILE_LIST_RESPONSE, msg);
            });
        });
        socket.on(shared_1.MessageType.REMOTE_LIST_REQUEST, (msg) => {
            const workerSocket = exports.connectedWorkers.get(msg.workerId);
            if (workerSocket) {
                workerSocket.emit(shared_1.MessageType.REMOTE_LIST_REQUEST, msg);
            }
        });
        socket.on(shared_1.MessageType.REMOTE_LIST_RESPONSE, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.REMOTE_LIST_RESPONSE, msg);
            });
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
                const worker = workers[roundRobinIndex % workers.length];
                worker.emit(shared_1.MessageType.TASK_ASSIGNMENT, {
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

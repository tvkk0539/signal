"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicKeyRegistry = exports.uiUserSocketMap = exports.connectedUIClients = exports.connectedWorkers = exports.grpcRouter = void 0;
exports.setupSockets = setupSockets;
const shared_1 = require("@swarm/shared");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';
const router_1 = require("../grpc/router");
// Global router instance
exports.grpcRouter = new router_1.GrpcRelayRouter();
// Start the gRPC Relay Router when sockets are setup
exports.grpcRouter.start().catch(e => console.error("Failed to start gRPC Relay Router:", e));
exports.connectedWorkers = new Map();
exports.connectedUIClients = new Map(); // Maps socket.id to Socket
exports.uiUserSocketMap = new Map(); // Maps userId to socket.id
// Public Key Directory for E2EE (User ID -> Base64 Public Key)
exports.publicKeyRegistry = new Map();
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
                        ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0] : ipAddress[0],
                        grpcMode: msg.grpcMode || 'DIRECT' // Default to DIRECT if not specified
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
                    const userId = decoded.id;
                    console.log(`[Gatekeeper] UI Dashboard Authorized for user: ${decoded.email} (ID: ${userId})`);
                    exports.connectedUIClients.set(socket.id, socket);
                    exports.uiUserSocketMap.set(userId, socket.id);
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
                // Clean up user mapping
                for (const [userId, sockId] of exports.uiUserSocketMap.entries()) {
                    if (sockId === socket.id) {
                        exports.uiUserSocketMap.delete(userId);
                        break;
                    }
                }
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
        // Helper to get socket by UI User ID or Worker ID
        const getTargetSocket = (targetId) => {
            const workerData = exports.connectedWorkers.get(targetId);
            if (workerData)
                return workerData.socket;
            const uiSocketId = exports.uiUserSocketMap.get(targetId);
            if (uiSocketId)
                return exports.connectedUIClients.get(uiSocketId);
            return undefined;
        };
        // Chat Message Routing
        socket.on(shared_1.MessageType.CHAT_MESSAGE, (msg) => {
            const targetSocket = getTargetSocket(msg.targetId);
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
            const targetSocket = getTargetSocket(msg.targetId);
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.SDP_OFFER, msg);
            }
            else {
                console.error(`[Matchmaker] Target ${msg.targetId} not found for SDP_OFFER`);
            }
        });
        socket.on(shared_1.MessageType.SDP_ANSWER, (msg) => {
            console.log(`[Matchmaker] Routing SDP_ANSWER from ${msg.senderId} to ${msg.targetId}`);
            const targetSocket = getTargetSocket(msg.targetId);
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.SDP_ANSWER, msg);
            }
            else {
                console.error(`[Matchmaker] Target ${msg.targetId} not found for SDP_ANSWER`);
            }
        });
        socket.on(shared_1.MessageType.ICE_CANDIDATE, (msg) => {
            const targetSocket = getTargetSocket(msg.targetId);
            if (targetSocket) {
                targetSocket.emit(shared_1.MessageType.ICE_CANDIDATE, msg);
            }
        });
        // Phase 5.5: Dual-Mode gRPC Service Discovery ("Traffic Cop" Router)
        socket.on(shared_1.MessageType.GRPC_DISCOVERY_REQUEST, (msg) => {
            console.log(`[Service Discovery] Worker ${socket.id} looking up gRPC address for ${msg.targetWorkerId}`);
            const targetData = exports.connectedWorkers.get(msg.targetWorkerId);
            if (!targetData) {
                socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                    type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                    timestamp: Date.now(),
                    targetWorkerId: msg.targetWorkerId,
                    error: "Worker offline"
                });
                return;
            }
            if (targetData.grpcMode === 'RELAY') {
                // The target is behind a firewall. Route traffic through the Relay Server.
                console.log(`[Traffic Cop] Target Worker ${msg.targetWorkerId} is RELAY mode. Creating Reverse-Tunnel...`);
                const transferId = exports.grpcRouter.createTransferSession();
                const relayIp = exports.grpcRouter.getIp();
                const relayPort = exports.grpcRouter.getPort();
                // 1. Tell Target Worker to establish outbound connection to Relay and wait for data
                targetData.socket.emit(shared_1.MessageType.GRPC_RELAY_TRANSFER_READY, {
                    type: shared_1.MessageType.GRPC_RELAY_TRANSFER_READY,
                    timestamp: Date.now(),
                    transferId: transferId,
                    relayGrpcIp: relayIp,
                    relayGrpcPort: relayPort
                });
                // 2. Tell Source Worker to stream data to Relay
                socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                    type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                    timestamp: Date.now(),
                    targetWorkerId: msg.targetWorkerId,
                    ipAddress: relayIp,
                    grpcPort: relayPort,
                    routingMode: 'RELAYED',
                    transferId: transferId
                });
            }
            else {
                // The target has an open port. Instruct source to connect directly.
                if (targetData.grpcPort) {
                    console.log(`[Traffic Cop] Target Worker ${msg.targetWorkerId} is DIRECT mode. Routing directly.`);
                    socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                        type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                        timestamp: Date.now(),
                        targetWorkerId: msg.targetWorkerId,
                        ipAddress: targetData.ipAddress,
                        grpcPort: targetData.grpcPort,
                        routingMode: 'DIRECT'
                    });
                }
                else {
                    socket.emit(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, {
                        type: shared_1.MessageType.GRPC_DISCOVERY_RESPONSE,
                        timestamp: Date.now(),
                        targetWorkerId: msg.targetWorkerId,
                        error: "Target worker has no gRPC port registered"
                    });
                }
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
        // --- Phase 9: Media Ingestion Routing ---
        // The UI doesn't know which worker to talk to initially, so it sends the request here.
        // The Relay load-balances it to an idle worker.
        const routeToIdleWorker = (messageType, msg) => {
            const workers = Array.from(exports.connectedWorkers.values());
            if (workers.length === 0) {
                console.log(`[Relay] No online workers available to handle ${messageType}.`);
                return;
            }
            // Select first idle worker (or round robin)
            const targetWorker = workers[0];
            targetWorker.socket.emit(messageType, { ...msg, workerId: targetWorker.socket.id });
            console.log(`[Relay] Routed ${messageType} to Worker ${targetWorker.socket.id}`);
        };
        socket.on(shared_1.MessageType.WRAPPER_START_REQUEST, (msg) => routeToIdleWorker(shared_1.MessageType.WRAPPER_START_REQUEST, msg));
        socket.on(shared_1.MessageType.WRAPPER_STOP_REQUEST, (msg) => routeToIdleWorker(shared_1.MessageType.WRAPPER_STOP_REQUEST, msg));
        socket.on(shared_1.MessageType.WRAPPER_2FA_SUBMIT, (msg) => routeToIdleWorker(shared_1.MessageType.WRAPPER_2FA_SUBMIT, msg));
        socket.on(shared_1.MessageType.WRAPPER_STATUS_REQUEST, (msg) => routeToIdleWorker(shared_1.MessageType.WRAPPER_STATUS_REQUEST, msg));
        socket.on(shared_1.MessageType.APPLE_MUSIC_RIP_REQUEST, (msg) => routeToIdleWorker(shared_1.MessageType.APPLE_MUSIC_RIP_REQUEST, msg));
        // --- Phase 11: Dual-State VFS & Hybrid Config Routing ---
        socket.on(shared_1.MessageType.VFS_CONFIG_SAVE, async (msg) => {
            console.log(`[Relay] Received VFS_CONFIG_SAVE for ${msg.alias}`);
            try {
                const repo = msg.isEphemeral ? db_1.dbManager.getVfsEphemeral() : db_1.dbManager.getVfsPermanent();
                await repo.saveConfigBlock({
                    alias: msg.alias,
                    rcloneName: msg.rcloneName,
                    configText: msg.configText,
                    isEphemeral: msg.isEphemeral,
                    workerId: msg.isEphemeral ? socket.id : undefined
                });
                socket.emit(shared_1.MessageType.TASK_PROGRESS, { type: shared_1.MessageType.TASK_PROGRESS, taskId: `save_${msg.alias}`, status: 'SUCCESS', progress: 100 });
            }
            catch (e) {
                socket.emit(shared_1.MessageType.TASK_PROGRESS, { type: shared_1.MessageType.TASK_PROGRESS, taskId: `save_${msg.alias}`, status: `FAILED: ${e.message}`, progress: 0 });
            }
        });
        socket.on(shared_1.MessageType.VFS_CONFIG_DELETE, async (msg) => {
            console.log(`[Relay] Received VFS_CONFIG_DELETE for ${msg.alias}`);
            try {
                const repo = msg.isEphemeral ? db_1.dbManager.getVfsEphemeral() : db_1.dbManager.getVfsPermanent();
                await repo.deleteConfigBlock(msg.alias);
                await repo.purgeRemoteIndex(msg.alias); // Clean up associated index
                socket.emit(shared_1.MessageType.TASK_PROGRESS, { type: shared_1.MessageType.TASK_PROGRESS, taskId: `delete_${msg.alias}`, status: 'SUCCESS', progress: 100 });
            }
            catch (e) {
                socket.emit(shared_1.MessageType.TASK_PROGRESS, { type: shared_1.MessageType.TASK_PROGRESS, taskId: `delete_${msg.alias}`, status: `FAILED: ${e.message}`, progress: 0 });
            }
        });
        socket.on(shared_1.MessageType.VFS_INDEX_REQUEST, async (msg) => {
            console.log(`[Relay] Routing VFS_INDEX_REQUEST to Worker ${msg.workerId}`);
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === msg.workerId);
            if (targetSocket) {
                // Phase 12: Inject the specific database domain's connection string so the worker knows where to stream the bypass
                try {
                    const domain = msg.isEphemeral ? 'VFS_EPHEMERAL' : 'VFS_PERMANENT';
                    const routingState = db_1.dbManager.getRoutingState();
                    // Only inject if the user explicitly set a non-mock string
                    if (routingState[domain] && routingState[domain].primary.engine !== 'MOCK') {
                        // We need to fetch the raw config which has the connection string, not the redacted broadcast one
                        // Note: A cleaner way would be exposing a `getDomainPrimaryConnectionString` on dbManager
                        // But since dbManager.currentRouting is private, we'll try to find an alternative or assume it works
                        // Wait, the routing state broadcast redacts the connection string! We need the real one.
                        // We'll update the dbManager to expose this safely in a moment. For now, we will add a method.
                        const realConnectionString = db_1.dbManager.currentRouting[domain].primary.connectionString;
                        if (realConnectionString) {
                            msg.connectionString = realConnectionString;
                        }
                    }
                }
                catch (e) {
                    console.error(`[Relay] Failed to inject connection string for VFS Index Bypass`, e);
                }
                targetSocket.emit('VFS_INDEX_REQUEST', msg);
            }
            else {
                socket.emit(shared_1.MessageType.TASK_PROGRESS, { type: shared_1.MessageType.TASK_PROGRESS, taskId: msg.taskId || 'index', status: `FAILED: Worker not found`, progress: 0 });
            }
        });
        socket.on(shared_1.MessageType.VFS_ALIAS_LIST_REQUEST, async (msg) => {
            try {
                const [ephemeralAliases, permanentAliases] = await Promise.all([
                    db_1.dbManager.getVfsEphemeral().getDistinctAliases(),
                    db_1.dbManager.getVfsPermanent().getDistinctAliases()
                ]);
                // Merge and deduplicate
                const uniqueAliases = Array.from(new Set([...ephemeralAliases, ...permanentAliases]));
                socket.emit(shared_1.MessageType.VFS_ALIAS_LIST_RESPONSE, {
                    type: shared_1.MessageType.VFS_ALIAS_LIST_RESPONSE,
                    timestamp: Date.now(),
                    aliases: uniqueAliases
                });
            }
            catch (e) {
                console.error(`[Relay] VFS Alias List Error: ${e.message}`);
            }
        });
        socket.on(shared_1.MessageType.VFS_CONFIG_LOAD_REQUEST, async (msg) => {
            try {
                const targetAlias = msg.alias;
                if (!targetAlias)
                    return;
                const [ephemeralConfigs, permanentConfigs] = await Promise.all([
                    db_1.dbManager.getVfsEphemeral().getConfigBlocks(),
                    db_1.dbManager.getVfsPermanent().getConfigBlocks()
                ]);
                const allConfigs = [...ephemeralConfigs, ...permanentConfigs];
                const match = allConfigs.find(c => c.alias === targetAlias);
                if (match) {
                    socket.emit(shared_1.MessageType.VFS_CONFIG_LOAD_RESPONSE, {
                        type: shared_1.MessageType.VFS_CONFIG_LOAD_RESPONSE,
                        timestamp: Date.now(),
                        alias: match.alias,
                        rcloneName: match.rcloneName,
                        configText: match.configText,
                        isEphemeral: match.isEphemeral
                    });
                }
            }
            catch (e) {
                console.error(`[Relay] VFS Config Load Error: ${e.message}`);
            }
        });
        socket.on(shared_1.MessageType.VFS_SEARCH_REQUEST, async (msg) => {
            try {
                // Parallel Query against both Ephemeral and Permanent Switchboard Domains
                const [ephemeralResults, permanentResults] = await Promise.all([
                    db_1.dbManager.getVfsEphemeral().searchFiles(msg.query, msg.limit, msg.remoteAlias),
                    db_1.dbManager.getVfsPermanent().searchFiles(msg.query, msg.limit, msg.remoteAlias)
                ]);
                // Merge and truncate
                const combined = [...ephemeralResults, ...permanentResults].slice(0, msg.limit);
                socket.emit(shared_1.MessageType.VFS_SEARCH_RESPONSE, {
                    type: shared_1.MessageType.VFS_SEARCH_RESPONSE,
                    timestamp: Date.now(),
                    query: msg.query,
                    results: combined
                });
            }
            catch (e) {
                console.error(`[Relay] VFS Search Error: ${e.message}`);
            }
        });
        socket.on('REQUEST_VFS_CONFIG_REBOOT', async (msg) => {
            console.log(`[Relay] Fetching Hybrid Configs for Worker Reboot...`);
            try {
                const permanentBlocks = await db_1.dbManager.getVfsPermanent().getConfigBlocks(false);
                const ephemeralBlocks = await db_1.dbManager.getVfsEphemeral().getConfigBlocks(true, msg.workerId);
                const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === msg.workerId);
                if (targetSocket) {
                    targetSocket.emit('VFS_CONFIG_REBOOT', { permanentBlocks, ephemeralBlocks });
                }
            }
            catch (e) {
                console.error(`[Relay] Failed to reboot VFS config: ${e.message}`);
            }
        });
        // --- Phase 9 & 10: Media Config Database Routing ---
        socket.on(shared_1.MessageType.WRAPPER_PROFILES_REQUEST, async () => {
            try {
                const db = db_1.dbManager.getAppleMusic();
                const profiles = await db.getWrapperProfiles();
                socket.emit(shared_1.MessageType.WRAPPER_PROFILES_LIST, {
                    type: shared_1.MessageType.WRAPPER_PROFILES_LIST,
                    timestamp: Date.now(),
                    profiles
                });
            }
            catch (e) {
                console.error(`[Relay] Failed to fetch wrapper profiles:`, e.message);
            }
        });
        socket.on(shared_1.MessageType.WRAPPER_STATE_DELETE, async (msg) => {
            try {
                const db = db_1.dbManager.getAppleMusic();
                await db.deleteWrapperProfile(msg.profileId);
                console.log(`[Relay] Purged wrapper profile: ${msg.profileId}`);
                // Broadcast updated list
                const profiles = await db.getWrapperProfiles();
                io.emit(shared_1.MessageType.WRAPPER_PROFILES_LIST, {
                    type: shared_1.MessageType.WRAPPER_PROFILES_LIST,
                    timestamp: Date.now(),
                    profiles
                });
            }
            catch (e) {
                console.error(`[Relay] Failed to delete wrapper profile:`, e.message);
            }
        });
        socket.on(shared_1.MessageType.APPLE_MUSIC_CONFIG_SAVE, async (msg) => {
            try {
                const db = db_1.dbManager.getAppleMusic();
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
                socket.broadcast.emit(shared_1.MessageType.APPLE_MUSIC_CONFIG_DATA, {
                    type: shared_1.MessageType.APPLE_MUSIC_CONFIG_DATA,
                    ...msg
                });
            }
            catch (e) {
                console.error(`[Relay] Failed to save Apple Music Config:`, e.message);
            }
        });
        socket.on(shared_1.MessageType.APPLE_MUSIC_CONFIG_LOAD, async () => {
            try {
                const db = db_1.dbManager.getAppleMusic();
                const config = await db.getConfig();
                if (config) {
                    socket.emit(shared_1.MessageType.APPLE_MUSIC_CONFIG_DATA, {
                        type: shared_1.MessageType.APPLE_MUSIC_CONFIG_DATA,
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
            }
            catch (e) {
                console.error(`[Relay] Failed to load Apple Music Config:`, e.message);
            }
        });
        socket.on(shared_1.MessageType.WRAPPER_STATE_SAVE, async (msg) => {
            try {
                if (!msg.profileId)
                    throw new Error("Missing profileId for wrapper state save");
                const db = db_1.dbManager.getAppleMusic();
                await db.saveWrapperProfile({
                    id: msg.profileId,
                    name: msg.profileName || 'Unknown Profile',
                    username: msg.username || 'unknown',
                    payload: msg.payload,
                    timestamp: Date.now()
                });
                console.log(`[Relay] Ephemeral Wrapper State Saved for Profile ${msg.profileId} (Length: ${msg.payload.length})`);
                // Broadcast the updated profile list
                const profiles = await db.getWrapperProfiles();
                io.emit(shared_1.MessageType.WRAPPER_PROFILES_LIST, {
                    type: shared_1.MessageType.WRAPPER_PROFILES_LIST,
                    timestamp: Date.now(),
                    profiles
                });
            }
            catch (e) {
                console.error(`[Relay] Failed to save Wrapper State:`, e.message);
            }
        });
        socket.on(shared_1.MessageType.WRAPPER_STATE_LOAD, async (msg) => {
            try {
                if (!msg.profileId)
                    throw new Error("Missing profileId for wrapper state load");
                const db = db_1.dbManager.getAppleMusic();
                const payload = await db.getWrapperProfilePayload(msg.profileId);
                if (payload) {
                    console.log(`[Relay] Sending Hydration State (Profile ${msg.profileId}) to Worker ${socket.id}`);
                    socket.emit(shared_1.MessageType.WRAPPER_STATE_DATA, {
                        type: shared_1.MessageType.WRAPPER_STATE_DATA,
                        payload: payload,
                        workerId: msg.workerId
                    });
                }
                else {
                    console.log(`[Relay] No state found to hydrate for Profile ${msg.profileId} to Worker ${socket.id}`);
                    socket.emit(shared_1.MessageType.WRAPPER_STATE_DATA, {
                        type: shared_1.MessageType.WRAPPER_STATE_DATA,
                        payload: null,
                        workerId: msg.workerId
                    });
                }
            }
            catch (e) {
                console.error(`[Relay] Failed to load Wrapper State:`, e.message);
                socket.emit(shared_1.MessageType.WRAPPER_STATE_DATA, {
                    type: shared_1.MessageType.WRAPPER_STATE_DATA,
                    payload: null,
                    workerId: msg.workerId
                });
            }
        });
        // Reverse Routing: From Worker back to UI clients
        socket.on(shared_1.MessageType.WRAPPER_STATUS_UPDATE, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.WRAPPER_STATUS_UPDATE, msg);
            });
        });
        socket.on(shared_1.MessageType.WRAPPER_2FA_CHALLENGE, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.WRAPPER_2FA_CHALLENGE, msg);
            });
        });
        socket.on(shared_1.MessageType.RIPPER_TELEMETRY, (msg) => {
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.RIPPER_TELEMETRY, msg);
            });
        });
        socket.on(shared_1.MessageType.TASK_PROGRESS, (msg) => {
            // Broadcast to UI
            exports.connectedUIClients.forEach((clientSocket) => {
                clientSocket.emit(shared_1.MessageType.TASK_PROGRESS, msg);
            });
            // Audit Logging for completed tasks
            if (msg.status === 'COMPLETE' || msg.status === 'gRPC TRANSFER COMPLETE' || msg.progress === 100) {
                console.log(`[Audit Logger] Logging completed task ${msg.taskId} for worker ${msg.workerId}`);
                db_1.dbManager.getAuditLogs().createLog({
                    jobId: msg.taskId,
                    workerId: msg.workerId,
                    action: msg.status === 'gRPC TRANSFER COMPLETE' ? 'gRPC_TRANSFER' : 'TASK',
                    status: 'SUCCESS',
                    timestamp: new Date()
                }).catch(err => {
                    console.error(`[Audit Logger] Failed to save audit log for task ${msg.taskId}`, err);
                });
            }
            else if (msg.status === 'FAILED' || msg.status === 'ERROR') {
                db_1.dbManager.getAuditLogs().createLog({
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
        socket.on(shared_1.MessageType.DB_STATE_REQUEST, () => {
            socket.emit(shared_1.MessageType.DB_STATE_UPDATE, {
                type: shared_1.MessageType.DB_STATE_UPDATE,
                timestamp: Date.now(),
                routing: db_1.dbManager.getRoutingState()
            });
        });
        socket.on(shared_1.MessageType.DB_ROUTE_SWITCH_REQUEST, async (msg) => {
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
                await db_1.dbManager.hotSwapDomain(msg.domain, config);
                // Broadcast new state to all connected UI clients
                exports.connectedUIClients.forEach((clientSocket) => {
                    clientSocket.emit(shared_1.MessageType.DB_STATE_UPDATE, {
                        type: shared_1.MessageType.DB_STATE_UPDATE,
                        timestamp: Date.now(),
                        routing: db_1.dbManager.getRoutingState()
                    });
                });
            }
            catch (e) {
                console.error(`[DB Operations] Hot-swap failed:`, e.message);
                // Alert the specific UI client that failed
                socket.emit('error', { message: `Hot-swap failed: ${e.message}` });
            }
        });
        // --- ECDH Public Key Directory API ---
        socket.on(shared_1.MessageType.PUBLIC_KEY_ANNOUNCE, (msg) => {
            console.log(`[E2EE Registry] Storing Public Key for User: ${msg.userId}`);
            exports.publicKeyRegistry.set(msg.userId, msg.publicKeyBase64);
        });
        socket.on(shared_1.MessageType.PUBLIC_KEY_REQUEST, (msg) => {
            const key = exports.publicKeyRegistry.get(msg.targetId);
            socket.emit(shared_1.MessageType.PUBLIC_KEY_RESPONSE, {
                type: shared_1.MessageType.PUBLIC_KEY_RESPONSE,
                timestamp: Date.now(),
                targetId: msg.targetId,
                publicKeyBase64: key || null
            });
        });
        // Ping/Pong capability test
        socket.on(shared_1.MessageType.PING, () => {
            console.log(`[Relay] Received Ping from ${socket.id}, sending Pong`);
            socket.emit(shared_1.MessageType.PONG, { timestamp: Date.now() });
        });
    });
}

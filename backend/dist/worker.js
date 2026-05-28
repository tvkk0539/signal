"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const werift_1 = require("werift");
const shared_1 = require("@swarm/shared");
const RcloneDaemonManager_1 = require("./RcloneDaemonManager");
const server_1 = require("./grpc/server");
const client_1 = require("./grpc/client");
const RELAY_SERVER_URL = process.env.RELAY_URL || 'http://localhost:3001';
const WORKER_SECRET = process.env.WORKER_SECRET || 'fallback_for_dev_only';
const GRPC_MODE = process.env.GRPC_MODE || 'DIRECT';
const rcloneManager = new RcloneDaemonManager_1.RcloneDaemonManager();
const grpcServer = new server_1.GrpcSwarmServer();
async function bootWorker() {
    console.log(`[Worker] Booting up...`);
    let grpcPort = 0;
    try {
        console.log(`[Worker] Starting gRPC Server...`);
        grpcPort = await grpcServer.start();
        console.log(`[Worker] Starting Rclone Daemon...`);
        await rcloneManager.start();
    }
    catch (error) {
        console.error(`[Worker] CRITICAL ERROR: Could not start Rclone Daemon. Worker aborting.`);
        console.error(error);
        process.exit(1);
    }
    console.log(`[Worker] Attempting to connect to Relay Server at ${RELAY_SERVER_URL}`);
    // Outbound connection to bypass firewalls
    const socket = (0, socket_io_client_1.io)(RELAY_SERVER_URL);
    socket.on('connect', () => {
        console.log(`[Worker] Connected to Relay Server. Authenticating...`);
        const authMessage = {
            type: shared_1.MessageType.AUTH_REQUEST,
            timestamp: Date.now(),
            role: 'WORKER',
            token: WORKER_SECRET,
            grpcPort: grpcPort, // Phase 5: Tell the Fleet Admiral our gRPC address
            grpcMode: GRPC_MODE // Phase 5.5: Tell Relay our capabilities
        };
        socket.emit(shared_1.MessageType.AUTH_REQUEST, authMessage);
    });
    socket.on(shared_1.MessageType.AUTH_RESPONSE, (res) => {
        if (res.success) {
            console.log(`[Worker] Authentication Successful! Ready to accept tasks.`);
        }
        else {
            console.error(`[Worker] Authentication Failed.`);
        }
    });
    socket.on(shared_1.MessageType.PONG, (data) => {
        console.log(`[Worker] Received PONG from Relay Server (Ping: ${Date.now() - data.timestamp}ms)`);
    });
    socket.on(shared_1.MessageType.FILE_LIST_REQUEST, async (msg) => {
        console.log(`[Worker] Received FILE_LIST_REQUEST for directory: ${msg.directory} on fs: ${msg.fs || '/'}`);
        try {
            const files = await rcloneManager.listFiles(msg.fs || '/', msg.directory);
            const response = {
                type: shared_1.MessageType.FILE_LIST_RESPONSE,
                timestamp: Date.now(),
                workerId: msg.workerId,
                directory: msg.directory,
                fs: msg.fs,
                files: files
            };
            socket.emit(shared_1.MessageType.FILE_LIST_RESPONSE, response);
        }
        catch (error) {
            const errorResponse = {
                type: shared_1.MessageType.FILE_LIST_RESPONSE,
                timestamp: Date.now(),
                workerId: msg.workerId,
                directory: msg.directory,
                fs: msg.fs,
                files: [],
                error: error.message
            };
            socket.emit(shared_1.MessageType.FILE_LIST_RESPONSE, errorResponse);
        }
    });
    socket.on(shared_1.MessageType.REMOTE_LIST_REQUEST, async (msg) => {
        console.log(`[Worker] Received REMOTE_LIST_REQUEST`);
        try {
            const remotes = await rcloneManager.getRemotes();
            const response = {
                type: shared_1.MessageType.REMOTE_LIST_RESPONSE,
                timestamp: Date.now(),
                workerId: msg.workerId,
                remotes: remotes
            };
            socket.emit(shared_1.MessageType.REMOTE_LIST_RESPONSE, response);
        }
        catch (error) {
            const errorResponse = {
                type: shared_1.MessageType.REMOTE_LIST_RESPONSE,
                timestamp: Date.now(),
                workerId: msg.workerId,
                remotes: [],
                error: error.message
            };
            socket.emit(shared_1.MessageType.REMOTE_LIST_RESPONSE, errorResponse);
        }
    });
    socket.on(shared_1.MessageType.OFFLINE_FILE_UPLOAD_REQUEST, async (msg) => {
        console.log(`[Worker] Received OFFLINE_FILE_UPLOAD_REQUEST for ${msg.fileName}`);
        try {
            // Decode the base64 MVP payload
            const base64Data = msg.fileBuffer.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            // In a real scenario, RcloneDaemonManager would upload this to an S3 bucket
            // and return a presigned URL. For MVP, we mock the upload delay and link.
            console.log(`[Worker] Uploading ${msg.fileName} to Cloud Storage via rclone...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockedDownloadLink = `https://storage.swarm.local/download/${msg.fileName}?token=mock-token`;
            // Hand off the message back to the Relay for the target's chat history
            socket.emit(shared_1.MessageType.CHAT_MESSAGE, {
                type: shared_1.MessageType.CHAT_MESSAGE,
                timestamp: Date.now(),
                senderId: msg.senderId,
                targetId: msg.targetId,
                encryptedPayload: `File uploaded to cloud worker. Download link: ${mockedDownloadLink}`,
                hasAttachment: true,
                isSystemMessage: true
            });
            console.log(`[Worker] File Handoff Complete. Emitted message with link.`);
        }
        catch (e) {
            console.error(`[Worker] Failed offline file upload:`, e);
        }
    });
    // Phase 4: WebRTC Signaling for Streaming
    // The worker must be able to answer SDP Offers from the UI to establish the P2P pipe
    const peerConnections = new Map();
    const dataChannels = new Map();
    const RTC_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    socket.on(shared_1.MessageType.SDP_OFFER, async (msg) => {
        console.log(`[Worker] Received SDP_OFFER from UI Client ${msg.senderId} for Streaming`);
        try {
            const pc = new werift_1.RTCPeerConnection(RTC_CONFIG);
            peerConnections.set(msg.senderId, pc);
            pc.connectionStateChange.subscribe((state) => {
                console.log(`[Worker] WebRTC State with ${msg.senderId}: ${state}`);
                if (state === 'closed' || state === 'failed') {
                    peerConnections.delete(msg.senderId);
                    dataChannels.delete(msg.senderId);
                }
            });
            // The backend needs to listen for its own ICE candidates and send them to the UI
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit(shared_1.MessageType.ICE_CANDIDATE, {
                        type: shared_1.MessageType.ICE_CANDIDATE,
                        timestamp: Date.now(),
                        senderId: socket.id,
                        targetId: msg.senderId,
                        // werift's candidate might not have .toJSON(), so we manually reconstruct it
                        candidate: {
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            usernameFragment: event.candidate.usernameFragment
                        }
                    });
                }
            };
            pc.ondatachannel = ({ channel }) => {
                console.log(`[Worker] Received RTCDataChannel from ${msg.senderId}`);
                dataChannels.set(msg.senderId, channel);
                // When the UI sends a STREAM_REQUEST through the P2P DataChannel
                channel.onMessage.subscribe(async (buffer) => {
                    try {
                        const data = JSON.parse(buffer.toString());
                        if (data.type === shared_1.MessageType.STREAM_REQUEST) {
                            console.log(`[Worker] Stream requested via P2P for ${data.path}`);
                            // 1. First, stat the file to get its metadata
                            try {
                                const stat = await rcloneManager.statFile(data.fs, data.path);
                                // Determine MIME type dynamically based on extension
                                let mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'; // Default
                                const lowerPath = data.path.toLowerCase();
                                if (lowerPath.endsWith('.webm')) {
                                    mimeType = 'video/webm; codecs="vp9, opus"';
                                }
                                else if (lowerPath.endsWith('.mkv')) {
                                    // MKV often uses WebM's codecs or similar, but browser support varies.
                                    mimeType = 'video/webm; codecs="vp9, opus"';
                                }
                                const metadataMsg = {
                                    type: shared_1.MessageType.STREAM_METADATA,
                                    timestamp: Date.now(),
                                    workerId: socket.id,
                                    fileName: stat.Name || data.path.split('/').pop(),
                                    fileSize: stat.Size || 0,
                                    mimeType: mimeType
                                };
                                // Send metadata BEFORE starting the binary stream
                                console.log(`[Worker] Sending STREAM_METADATA for ${metadataMsg.fileName} (${metadataMsg.mimeType})`);
                                channel.send(JSON.stringify(metadataMsg));
                            }
                            catch (e) {
                                console.error(`[Worker] Failed to stat file:`, e.message);
                                // We could send an error or proceed without metadata. Proceeding for resilience.
                            }
                            // 2. Fetch file stream from rclone
                            const stream = await rcloneManager.streamFile(data.fs, data.path, data.startByte, data.endByte);
                            // 3. Pipe the stream directly into the WebRTC DataChannel (On-The-Fly Memory Streaming)
                            // CRITICAL FIX: WebRTC DataChannels have strict message size limits (usually 16-64KB).
                            // We must chunk the Node stream into smaller buffers before sending.
                            const CHUNK_SIZE = 16384; // 16KB is extremely safe for all browsers
                            // CRITICAL FIX 2: Backpressure Management
                            // If we blast chunks into werift faster than the network can send them,
                            // werift's buffer overflows and it silently drops packets (resulting in 300 byte files).
                            const BUFFER_LIMIT = 1024 * 1024; // 1MB buffer limit
                            const sendChunk = async (slice) => {
                                // Wait if the buffer is too full
                                while (channel.bufferedAmount > BUFFER_LIMIT) {
                                    await new Promise(resolve => setTimeout(resolve, 10)); // Yield event loop
                                }
                                try {
                                    channel.send(slice);
                                }
                                catch (e) {
                                    console.error(`[Worker] WebRTC send failed:`, e);
                                }
                            };
                            stream.on('data', async (rawChunk) => {
                                // Pause the rclone stream while we process this massive chunk
                                stream.pause();
                                let offset = 0;
                                while (offset < rawChunk.length) {
                                    const end = Math.min(offset + CHUNK_SIZE, rawChunk.length);
                                    const slice = rawChunk.subarray(offset, end);
                                    await sendChunk(slice);
                                    offset = end;
                                }
                                // Resume pulling from rclone
                                stream.resume();
                            });
                            stream.on('end', async () => {
                                console.log(`[Worker] Stream complete for ${data.path}. Waiting for buffer to flush...`);
                                // Wait for the WebRTC buffer to completely empty before sending the END signal
                                while (channel.bufferedAmount > 0) {
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                }
                                console.log(`[Worker] Buffer flushed. Sending STREAM_END.`);
                                try {
                                    channel.send(JSON.stringify({ type: 'STREAM_END' }));
                                }
                                catch (e) { }
                            });
                            stream.on('error', (err) => {
                                console.error(`[Worker] Rclone VFS Stream Error:`, err);
                                try {
                                    channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message }));
                                }
                                catch (e) { }
                            });
                        }
                    }
                    catch (e) {
                        // Not a JSON message, ignore
                    }
                });
            };
            await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // Send Answer back to Relay
            socket.emit(shared_1.MessageType.SDP_ANSWER, {
                type: shared_1.MessageType.SDP_ANSWER,
                timestamp: Date.now(),
                senderId: socket.id,
                targetId: msg.senderId,
                sdp: pc.localDescription?.sdp
            });
            console.log(`[Worker] Sent SDP_ANSWER back to UI Client ${msg.senderId}`);
        }
        catch (e) {
            console.error(`[Worker] Failed to setup WebRTC Peer Connection:`, e);
        }
    });
    socket.on(shared_1.MessageType.ICE_CANDIDATE, async (msg) => {
        console.log(`[Worker] Received ICE_CANDIDATE from ${msg.senderId}`);
        const pc = peerConnections.get(msg.senderId);
        if (pc && msg.candidate) {
            try {
                await pc.addIceCandidate(msg.candidate);
            }
            catch (e) {
                console.error(`[Worker] Error adding ICE candidate:`, e);
            }
        }
    });
    // Phase 5.5: Listen for Reverse-Tunnel requests from Relay
    socket.on(shared_1.MessageType.GRPC_RELAY_TRANSFER_READY, async (msg) => {
        console.log(`[Worker] Received Reverse-Tunnel request from Relay for transfer ${msg.transferId}`);
        try {
            const grpcClient = new client_1.GrpcSwarmClient(msg.relayGrpcIp, msg.relayGrpcPort);
            // In a real app, you would stream this buffer to disk using fs.createWriteStream.
            // For MVP, we'll log the receipt of the chunks.
            let totalReceived = 0;
            await grpcClient.receivePipe(msg.transferId, (chunk) => {
                totalReceived += chunk.length;
                // process.stdout.write(`.`); // Optional visual indicator
            }, () => {
                console.log(`\n[Worker] Reverse-Tunnel Transfer Complete! Total bytes: ${totalReceived}`);
            }, (err) => {
                console.error(`[Worker] Reverse-Tunnel Transfer Error:`, err);
            });
        }
        catch (e) {
            console.error(`[Worker] Failed to establish Reverse-Tunnel to Relay:`, e);
        }
    });
    socket.on(shared_1.MessageType.TASK_ASSIGNMENT, async (msg) => {
        console.log(`[Worker] Received TASK_ASSIGNMENT: ${msg.taskId} (${msg.taskType})`);
        if (msg.taskType === 'WORKER_TO_WORKER_TRANSFER') {
            // Phase 5: Initiate a gRPC transfer to another worker
            console.log(`[Worker] Initiating gRPC Worker-to-Worker Transfer...`);
            const targetWorkerId = msg.payload.targetWorkerId;
            const fileToStream = msg.payload.file;
            // 1. Look up target worker's gRPC IP/Port via Relay Service Discovery
            const discoveryReq = {
                type: shared_1.MessageType.GRPC_DISCOVERY_REQUEST,
                timestamp: Date.now(),
                targetWorkerId: targetWorkerId
            };
            socket.emit(shared_1.MessageType.GRPC_DISCOVERY_REQUEST, discoveryReq);
            // Temporary listener for the response
            const handleDiscoveryResponse = async (res) => {
                if (res.targetWorkerId === targetWorkerId) {
                    socket.off(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, handleDiscoveryResponse);
                    if (res.error) {
                        console.error(`[Worker] Service Discovery Failed: ${res.error}`);
                        return;
                    }
                    console.log(`[Worker] Discovered Target Worker. Routing Mode: ${res.routingMode || 'DIRECT'}, Target: ${res.ipAddress}:${res.grpcPort}`);
                    try {
                        // 2. Fetch the massive file from Rclone VFS
                        const stream = await rcloneManager.streamFile('/', fileToStream);
                        // 3. Connect gRPC Client and pipe the data!
                        const grpcClient = new client_1.GrpcSwarmClient(res.ipAddress, res.grpcPort);
                        // If Relay gave us a transferId, use it. Otherwise generate a local one.
                        const transferId = res.transferId || `transfer_${Date.now()}`;
                        const status = await grpcClient.pipeStream(transferId, stream);
                        console.log(`[Worker] gRPC Transfer Complete! Payload Status:`, status);
                        // Notify UI
                        socket.emit(shared_1.MessageType.TASK_PROGRESS, {
                            type: shared_1.MessageType.TASK_PROGRESS,
                            timestamp: Date.now(),
                            taskId: msg.taskId,
                            workerId: socket.id,
                            progress: 100,
                            status: 'gRPC TRANSFER COMPLETE'
                        });
                    }
                    catch (e) {
                        console.error(`[Worker] gRPC Transfer Failed:`, e);
                    }
                }
            };
            socket.on(shared_1.MessageType.GRPC_DISCOVERY_RESPONSE, handleDiscoveryResponse);
        }
        else {
            // Standard UI task simulation
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 10) + 1;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                socket.emit(shared_1.MessageType.TASK_PROGRESS, {
                    type: shared_1.MessageType.TASK_PROGRESS,
                    timestamp: Date.now(),
                    taskId: msg.taskId,
                    workerId: socket.id,
                    progress: progress,
                    status: progress === 100 ? 'COMPLETE' : 'DOWNLOADING'
                });
            }, 50);
        }
    });
    socket.on('disconnect', () => {
        console.log(`[Worker] Disconnected from Relay Server.`);
    });
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log(`[Worker] Shutting down...`);
        rcloneManager.stop();
        grpcServer.stop();
        socket.disconnect();
        process.exit(0);
    });
}
bootWorker();

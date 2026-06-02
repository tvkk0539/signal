"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const werift_1 = require("werift");
const shared_1 = require("@swarm/shared");
const RcloneDaemonManager_1 = require("./RcloneDaemonManager");
const server_1 = require("./grpc/server");
const client_1 = require("./grpc/client");
const AppleMusicWrapperManager_1 = require("./services/AppleMusicWrapperManager");
const AppleMusicRipperService_1 = require("./services/AppleMusicRipperService");
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
    // --- Phase 9: Media Ingestion Managers ---
    const wrapperManager = AppleMusicWrapperManager_1.AppleMusicWrapperManager.getInstance();
    const ripperService = new AppleMusicRipperService_1.AppleMusicRipperService();
    wrapperManager.on('requires_2fa', () => {
        socket.emit(shared_1.MessageType.WRAPPER_2FA_CHALLENGE, {
            type: shared_1.MessageType.WRAPPER_2FA_CHALLENGE,
            timestamp: Date.now(),
            workerId: socket.id
        });
    });
    wrapperManager.on('log', (log) => {
        socket.emit(shared_1.MessageType.WRAPPER_STATUS_UPDATE, {
            type: shared_1.MessageType.WRAPPER_STATUS_UPDATE,
            timestamp: Date.now(),
            workerId: socket.id,
            ...wrapperManager.getStatus()
        });
    });
    ripperService.on('telemetry', (data) => {
        socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
            type: shared_1.MessageType.RIPPER_TELEMETRY,
            timestamp: Date.now(),
            workerId: socket.id,
            jobId: data.jobId,
            log: data.log
        });
    });
    ripperService.on('progress', (data) => {
        socket.emit(shared_1.MessageType.RIPPER_PROGRESS_UPDATE, {
            type: shared_1.MessageType.RIPPER_PROGRESS_UPDATE,
            timestamp: Date.now(),
            workerId: socket.id,
            jobId: data.jobId,
            phase: data.phase,
            progressPercent: data.progressPercent,
            dataMetrics: data.dataMetrics,
            speed: data.speed
        });
    });
    ripperService.on('job_complete', async (data) => {
        socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
            type: shared_1.MessageType.RIPPER_TELEMETRY,
            timestamp: Date.now(),
            workerId: socket.id,
            jobId: data.jobId,
            log: `[SYSTEM] Job finished with status: ${data.status}`
        });
        if (data.status === 'SUCCESS' && data.downloadDir) {
            if (!data.autoUpload) {
                socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
                    type: shared_1.MessageType.RIPPER_TELEMETRY,
                    timestamp: Date.now(),
                    workerId: socket.id,
                    jobId: data.jobId,
                    log: `[SYSTEM] Cloud Handoff Disabled by User. Files securely preserved in ephemeral storage.`
                });
                // We intentionally DO NOT call ripperService.cleanupWorkspace() here.
                return;
            }
            try {
                socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
                    type: shared_1.MessageType.RIPPER_TELEMETRY,
                    timestamp: Date.now(),
                    workerId: socket.id,
                    jobId: data.jobId,
                    log: `[SYSTEM] Initiating Rclone Cloud Handoff to ${data.rcloneRemote}...`
                });
                // Using the UI-provided rcloneRemote path (e.g., 'remote:/Media/AppleMusic_Rips')
                // Split it if it contains a path, otherwise use root.
                const remoteParts = data.rcloneRemote.split(':');
                const fsStr = remoteParts[0] + ':';
                const pathStr = remoteParts.length > 1 ? remoteParts[1] : '/';
                // We await this. If it throws, we skip the cleanup block.
                await rcloneManager.uploadDirectory(data.downloadDir, fsStr, pathStr);
                socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
                    type: shared_1.MessageType.RIPPER_TELEMETRY,
                    timestamp: Date.now(),
                    workerId: socket.id,
                    jobId: data.jobId,
                    log: `[SUCCESS] Cloud Handoff Upload Confirmed.`
                });
                // SMART CONFIRMATION: The upload completed successfully without errors.
                // ONLY NOW do we securely annihilate the ephemeral payload.
                ripperService.cleanupWorkspace(data.jobId);
            }
            catch (e) {
                console.error(`[Worker] Rclone Handoff Error:`, e);
                socket.emit(shared_1.MessageType.RIPPER_TELEMETRY, {
                    type: shared_1.MessageType.RIPPER_TELEMETRY,
                    timestamp: Date.now(),
                    workerId: socket.id,
                    jobId: data.jobId,
                    log: `[ERROR] Cloud Handoff Failed: ${e.message}. Files have NOT been deleted.`
                });
                // SMART CONFIRMATION: Upload threw an error. We intentionally skip cleanupWorkspace().
            }
        }
    });
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
    socket.on(shared_1.MessageType.AUTH_RESPONSE, async (res) => {
        if (res.success) {
            console.log(`[Worker] Authentication Successful! Ready to accept tasks.`);
            // PHASE C: VFS Tree Scanner Boot Sequence
            try {
                const remotes = await rcloneManager.getRemotes();
                const permRemotes = await rcloneManager.getPermanentRemotesFromConfig();
                for (const remote of remotes) {
                    if (remote.name === '/')
                        continue; // Skip local machine root
                    const isPerm = permRemotes.includes(remote.name);
                    await scanAndSyncVfsTree(remote.name, isPerm);
                }
            }
            catch (err) {
                console.error(`[Worker] Failed initial VFS scan:`, err.message);
            }
        }
        else {
            console.error(`[Worker] Authentication Failed.`);
        }
    });
    const lastSyncTimes = new Map();
    const scanAndSyncVfsTree = async (remoteName, isPermanent) => {
        try {
            const lastSync = lastSyncTimes.get(remoteName);
            let rawList = [];
            if (isPermanent && lastSync) {
                console.log(`[Worker] Triggering Delta Sync for ${remoteName}`);
                rawList = await rcloneManager.buildVfsDeltaTree(remoteName, lastSync);
            }
            else {
                console.log(`[Worker] Triggering Full Scan for ${remoteName}`);
                rawList = await rcloneManager.buildVfsTree(remoteName);
            }
            lastSyncTimes.set(remoteName, new Date());
            if (rawList.length === 0) {
                console.log(`[Worker] No new/changed files to sync for ${remoteName}`);
                return;
            }
            const files = rawList.map((f) => ({
                id: Buffer.from(`${remoteName}${f.Path}`).toString('base64'),
                remoteName: remoteName,
                path: f.Path,
                name: f.Name,
                size: f.Size,
                mimeType: f.MimeType,
                isDir: f.IsDir,
                workerId: socket.id
            }));
            socket.emit(shared_1.MessageType.VFS_INDEX_SYNC, {
                type: shared_1.MessageType.VFS_INDEX_SYNC,
                timestamp: Date.now(),
                workerId: socket.id,
                remoteName: remoteName,
                isPermanent: isPermanent,
                // For MVP, we use the remoteName as the persistent anchor. In full prod, this is a UUID from the UI.
                persistentId: isPermanent ? `perm_anchor_${Buffer.from(remoteName).toString('base64')}` : undefined,
                files: files
            });
            console.log(`[Worker] Emitted VFS Tree (${files.length} items) to Relay Switchboard for ${remoteName} (Permanent: ${isPermanent})`);
        }
        catch (err) {
            console.error(`[Worker] Failed VFS scan for ${remoteName}:`, err.message);
        }
    };
    socket.on(shared_1.MessageType.CONFIG_MERGE_SYNC, async (msg) => {
        console.log(`[Worker] Received Permanent Rclone Config Block from UI.`);
        // Store current remotes before rebooting to compare later
        let oldRemotes = [];
        try {
            oldRemotes = await rcloneManager.getRemotes();
        }
        catch (e) { }
        // Merge configs and reboot daemon silently
        await rcloneManager.mergeAndApplyConfig(msg.permanentConfigBlock);
        rcloneManager.stop();
        await rcloneManager.start();
        console.log(`[Worker] Hybrid Config Applied and Daemon Rebooted.`);
        // Post-Reboot: Re-scan ONLY the newly added permanent remotes
        try {
            const newRemotes = await rcloneManager.getRemotes();
            for (const remote of newRemotes) {
                if (remote.name === '/')
                    continue;
                const isOld = oldRemotes.some(r => r.name === remote.name);
                if (!isOld) {
                    console.log(`[Worker] Detected new Permanent remote from merge: ${remote.name}`);
                    await scanAndSyncVfsTree(remote.name, true);
                }
            }
        }
        catch (e) {
            console.error(`[Worker] Failed post-merge VFS rescan:`, e.message);
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
                            const CHUNK_SIZE = 16384; // 16KB is extremely safe for all browsers, do NOT exceed 64KB for WebRTC compatibility
                            // CRITICAL FIX: Strict Asynchronous Backpressure Management
                            // We must use `for await` to prevent event loop interleaving that causes
                            // out-of-order packet delivery and stream corruption.
                            const BUFFER_LIMIT = 8 * 1024 * 1024; // 8MB buffer limit
                            const processStream = async () => {
                                try {
                                    // Listen for explicit stream errors (e.g. child process exit != 0)
                                    stream.on('error', (err) => {
                                        console.error(`[Worker] Rclone stream emitted error:`, err);
                                        if (channel.readyState === 'open') {
                                            try {
                                                channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message }));
                                            }
                                            catch (e) { }
                                        }
                                    });
                                    for await (const chunk of stream) {
                                        // Ensure the chunk is treated as a Buffer (rclone spawn stream outputs Buffers, but typing can be broad)
                                        const rawChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                                        // If the browser disconnected or stream closed, abort pulling from rclone
                                        if (channel.readyState !== 'open') {
                                            console.log(`[Worker] WebRTC channel closed mid-stream. Aborting rclone pipe.`);
                                            if ('destroy' in stream) {
                                                stream.destroy();
                                            }
                                            return;
                                        }
                                        let offset = 0;
                                        while (offset < rawChunk.length) {
                                            const end = Math.min(offset + CHUNK_SIZE, rawChunk.length);
                                            const slice = rawChunk.subarray(offset, end);
                                            // Strict Wait Loop
                                            while (channel.bufferedAmount > BUFFER_LIMIT) {
                                                if (channel.readyState !== 'open') {
                                                    if ('destroy' in stream)
                                                        stream.destroy();
                                                    return;
                                                }
                                                await new Promise(resolve => setTimeout(resolve, 10)); // Yield to network I/O
                                            }
                                            try {
                                                channel.send(slice);
                                            }
                                            catch (e) {
                                                console.error(`[Worker] WebRTC send failed:`, e);
                                                try {
                                                    channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: e.message }));
                                                }
                                                catch (err) { }
                                                if ('destroy' in stream)
                                                    stream.destroy();
                                                return;
                                            }
                                            offset = end;
                                        }
                                    }
                                    // Stream successfully finished downloading from rclone
                                    console.log(`[Worker] Stream pull complete for ${data.path}. Waiting for WebRTC buffer to flush...`);
                                    while (channel.bufferedAmount > 0 && channel.readyState === 'open') {
                                        await new Promise(resolve => setTimeout(resolve, 50));
                                    }
                                    if (channel.readyState === 'open') {
                                        console.log(`[Worker] Buffer flushed. Sending STREAM_END.`);
                                        try {
                                            channel.send(JSON.stringify({ type: 'STREAM_END' }));
                                        }
                                        catch (e) { }
                                    }
                                }
                                catch (err) {
                                    console.error(`[Worker] Rclone VFS Stream Error/Abort:`, err);
                                    if (channel.readyState === 'open') {
                                        try {
                                            channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message }));
                                        }
                                        catch (e) { }
                                    }
                                }
                            };
                            // Start the async processing
                            processStream();
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
    // --- Phase 9: WebSocket Ingestion Handlers ---
    socket.on(shared_1.MessageType.APPLE_MUSIC_CANCEL_REQUEST, (msg) => {
        console.log(`[Worker] Received APPLE_MUSIC_CANCEL_REQUEST for Job: ${msg.jobId}`);
        if (msg.jobId) {
            ripperService.cancelJob(msg.jobId);
        }
    });
    // Keep track of active profile in this worker instance
    let currentActiveProfileId = undefined;
    let currentActiveProfileName = undefined;
    let currentActiveUsername = undefined;
    socket.on(shared_1.MessageType.WRAPPER_START_REQUEST, async (msg) => {
        console.log(`[Worker] Received WRAPPER_START_REQUEST (Profile: ${msg.profileId || 'NEW'})`);
        try {
            if (!wrapperManager.isInstalled()) {
                await wrapperManager.install();
            }
            currentActiveProfileId = msg.profileId;
            currentActiveProfileName = msg.profileName;
            currentActiveUsername = msg.username;
            if (msg.profileId) {
                // Ephemeral State Hydration: Ask Relay for saved state before starting
                socket.emit(shared_1.MessageType.WRAPPER_STATE_LOAD, { workerId: socket.id, profileId: msg.profileId });
                const handleStateData = async (stateMsg) => {
                    if (stateMsg.workerId === socket.id) {
                        socket.off(shared_1.MessageType.WRAPPER_STATE_DATA, handleStateData);
                        if (stateMsg.payload) {
                            await wrapperManager.importState(stateMsg.payload);
                        }
                        await wrapperManager.start(msg.username, msg.password);
                    }
                };
                socket.on(shared_1.MessageType.WRAPPER_STATE_DATA, handleStateData);
            }
            else {
                // Brand new profile, no state to hydrate
                await wrapperManager.start(msg.username, msg.password);
            }
        }
        catch (e) {
            console.error(`[Worker] Wrapper Start Error:`, e);
        }
    });
    socket.on(shared_1.MessageType.WRAPPER_STOP_REQUEST, async (msg) => {
        console.log(`[Worker] Received WRAPPER_STOP_REQUEST`);
        // Ephemeral State Hydration: Save the DRM keys before killing it
        const statePayload = await wrapperManager.exportState();
        // We use the msg.profileId if provided, otherwise the one we tracked, or generate a random one if it's new
        const profileIdToSave = msg.profileId || currentActiveProfileId || `profile_${Date.now()}`;
        const profileNameToSave = currentActiveProfileName || `Profile - ${currentActiveUsername || 'Unknown'}`;
        if (statePayload) {
            socket.emit(shared_1.MessageType.WRAPPER_STATE_SAVE, {
                payload: statePayload,
                workerId: socket.id,
                profileId: profileIdToSave,
                profileName: profileNameToSave,
                username: currentActiveUsername
            });
        }
        wrapperManager.stop();
        currentActiveProfileId = undefined;
        currentActiveProfileName = undefined;
        currentActiveUsername = undefined;
    });
    socket.on(shared_1.MessageType.WRAPPER_2FA_SUBMIT, (msg) => {
        console.log(`[Worker] Received WRAPPER_2FA_SUBMIT`);
        try {
            wrapperManager.sendInput(msg.code);
        }
        catch (e) {
            console.error(`[Worker] Wrapper 2FA Input Error:`, e);
        }
    });
    socket.on(shared_1.MessageType.APPLE_MUSIC_RIP_REQUEST, async (msg) => {
        console.log(`[Worker] Received APPLE_MUSIC_RIP_REQUEST for URL: ${msg.url}`);
        try {
            await ripperService.executeRipJob({
                jobId: msg.jobId,
                url: msg.url,
                ripMode: msg.ripMode,
                mediaUserToken: msg.mediaUserToken || '',
                storefront: msg.storefront || 'us',
                format: msg.format,
                qualityLimit: msg.qualityLimit,
                embedLrc: msg.embedLrc,
                animatedArt: msg.animatedArt,
                saveM3u8Playlist: msg.saveM3u8Playlist,
                printJson: msg.printJson,
                debugMode: msg.debugMode,
                // Pass through routing preferences to the 'job_complete' handler
                autoUpload: msg.autoUpload ?? true,
                rcloneRemote: msg.rcloneRemote || 'remote:/Media/AppleMusic_Rips',
                lrcFormat: msg.lrcFormat,
                lrcType: msg.lrcType,
                language: msg.language,
                tagSortOrder: msg.tagSortOrder,
                saveLrcFile: msg.saveLrcFile,
                saveArtistCover: msg.saveArtistCover,
                useSongInfoForPlaylist: msg.useSongInfoForPlaylist,
                alacFix: msg.alacFix,
                coverSize: msg.coverSize,
                coverFormat: msg.coverFormat,
                explicitChoice: msg.explicitChoice,
                cleanChoice: msg.cleanChoice,
                appleMasterChoice: msg.appleMasterChoice,
                albumFolderFormat: msg.albumFolderFormat,
                playlistFolderFormat: msg.playlistFolderFormat,
                songFileFormat: msg.songFileFormat,
                artistFolderFormat: msg.artistFolderFormat,
                maxMemoryLimit: msg.maxMemoryLimit,
                exitOnError: msg.exitOnError,
                getM3u8Mode: msg.getM3u8Mode,
                aacType: msg.aacType,
                mvAudioType: msg.mvAudioType,
                mvMax: msg.mvMax,
                limitMax: msg.limitMax,
                dlAlbumcoverForPlaylist: msg.dlAlbumcoverForPlaylist,
                embyAnimatedArtwork: msg.embyAnimatedArtwork,
                convertFormat: msg.convertFormat,
                convertKeepOriginal: msg.convertKeepOriginal,
                convertSkipIfSourceMatches: msg.convertSkipIfSourceMatches,
                convertWithMetadata: msg.convertWithMetadata,
                convertWarnLossyToLossless: msg.convertWarnLossyToLossless,
                convertSkipLossyToLossless: msg.convertSkipLossyToLossless,
                convertCheckBadAlac: msg.convertCheckBadAlac,
                convertDeleteBadAlac: msg.convertDeleteBadAlac
            });
        }
        catch (e) {
            console.error(`[Worker] Ripper Execution Error:`, e);
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

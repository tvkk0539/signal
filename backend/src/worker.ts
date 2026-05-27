import { io, Socket } from 'socket.io-client';
import { RTCPeerConnection, RTCDataChannel } from 'werift';
import { MessageType, AuthRequestMessage, FileListRequestMessage, FileListResponseMessage, RemoteListRequestMessage, RemoteListResponseMessage } from '@swarm/shared';
import { RcloneDaemonManager } from './RcloneDaemonManager';

const RELAY_SERVER_URL = process.env.RELAY_URL || 'http://localhost:3001';
const WORKER_SECRET = process.env.WORKER_SECRET || 'fallback_for_dev_only';

const rcloneManager = new RcloneDaemonManager();

async function bootWorker() {
  console.log(`[Worker] Booting up... Starting Rclone Daemon...`);

  try {
    await rcloneManager.start();
  } catch (error) {
    console.error(`[Worker] CRITICAL ERROR: Could not start Rclone Daemon. Worker aborting.`);
    console.error(error);
    process.exit(1);
  }

  console.log(`[Worker] Attempting to connect to Relay Server at ${RELAY_SERVER_URL}`);

  // Outbound connection to bypass firewalls
  const socket: Socket = io(RELAY_SERVER_URL);

  socket.on('connect', () => {
    console.log(`[Worker] Connected to Relay Server. Authenticating...`);

    const authMessage: AuthRequestMessage = {
      type: MessageType.AUTH_REQUEST,
      timestamp: Date.now(),
      role: 'WORKER',
      token: WORKER_SECRET
    };

    socket.emit(MessageType.AUTH_REQUEST, authMessage);
  });

  socket.on(MessageType.AUTH_RESPONSE, (res: { success: boolean }) => {
    if (res.success) {
      console.log(`[Worker] Authentication Successful! Ready to accept tasks.`);
    } else {
      console.error(`[Worker] Authentication Failed.`);
    }
  });

  socket.on(MessageType.PONG, (data: { timestamp: number }) => {
    console.log(`[Worker] Received PONG from Relay Server (Ping: ${Date.now() - data.timestamp}ms)`);
  });

  socket.on(MessageType.FILE_LIST_REQUEST, async (msg: FileListRequestMessage) => {
    console.log(`[Worker] Received FILE_LIST_REQUEST for directory: ${msg.directory} on fs: ${msg.fs || '/'}`);
    try {
      const files = await rcloneManager.listFiles(msg.fs || '/', msg.directory);
      const response: FileListResponseMessage = {
        type: MessageType.FILE_LIST_RESPONSE,
        timestamp: Date.now(),
        workerId: msg.workerId,
        directory: msg.directory,
        fs: msg.fs,
        files: files
      };
      socket.emit(MessageType.FILE_LIST_RESPONSE, response);
    } catch (error: any) {
      const errorResponse: FileListResponseMessage = {
        type: MessageType.FILE_LIST_RESPONSE,
        timestamp: Date.now(),
        workerId: msg.workerId,
        directory: msg.directory,
        fs: msg.fs,
        files: [],
        error: error.message
      };
      socket.emit(MessageType.FILE_LIST_RESPONSE, errorResponse);
    }
  });

  socket.on(MessageType.REMOTE_LIST_REQUEST, async (msg: RemoteListRequestMessage) => {
    console.log(`[Worker] Received REMOTE_LIST_REQUEST`);
    try {
      const remotes = await rcloneManager.getRemotes();
      const response: RemoteListResponseMessage = {
        type: MessageType.REMOTE_LIST_RESPONSE,
        timestamp: Date.now(),
        workerId: msg.workerId,
        remotes: remotes
      };
      socket.emit(MessageType.REMOTE_LIST_RESPONSE, response);
    } catch (error: any) {
      const errorResponse: RemoteListResponseMessage = {
        type: MessageType.REMOTE_LIST_RESPONSE,
        timestamp: Date.now(),
        workerId: msg.workerId,
        remotes: [],
        error: error.message
      };
      socket.emit(MessageType.REMOTE_LIST_RESPONSE, errorResponse);
    }
  });

  socket.on(MessageType.OFFLINE_FILE_UPLOAD_REQUEST, async (msg: any) => {
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
      socket.emit(MessageType.CHAT_MESSAGE, {
        type: MessageType.CHAT_MESSAGE,
        timestamp: Date.now(),
        senderId: msg.senderId,
        targetId: msg.targetId,
        encryptedPayload: `File uploaded to cloud worker. Download link: ${mockedDownloadLink}`,
        hasAttachment: true,
        isSystemMessage: true
      });
      console.log(`[Worker] File Handoff Complete. Emitted message with link.`);

    } catch (e) {
      console.error(`[Worker] Failed offline file upload:`, e);
    }
  });

  // Phase 4: WebRTC Signaling for Streaming
  // The worker must be able to answer SDP Offers from the UI to establish the P2P pipe
  const peerConnections = new Map<string, RTCPeerConnection>();
  const dataChannels = new Map<string, RTCDataChannel>();

  socket.on(MessageType.SDP_OFFER, async (msg: any) => {
    console.log(`[Worker] Received SDP_OFFER from UI Client ${msg.senderId} for Streaming`);
    try {
      const pc = new RTCPeerConnection();
      peerConnections.set(msg.senderId, pc);

      pc.connectionStateChange.subscribe((state: any) => {
        console.log(`[Worker] WebRTC State with ${msg.senderId}: ${state}`);
        if (state === 'closed' || state === 'failed') {
          peerConnections.delete(msg.senderId);
          dataChannels.delete(msg.senderId);
        }
      });

      pc.ondatachannel = ({ channel }) => {
        console.log(`[Worker] Received RTCDataChannel from ${msg.senderId}`);
        dataChannels.set(msg.senderId, channel);

        // When the UI sends a STREAM_REQUEST through the P2P DataChannel
        channel.onMessage.subscribe(async (buffer: any) => {
          try {
            const data = JSON.parse(buffer.toString());
            if (data.type === MessageType.STREAM_REQUEST) {
              console.log(`[Worker] Stream requested via P2P for ${data.path}`);

              // 1. Fetch file stream from rclone
              const stream = await rcloneManager.streamFile(data.fs, data.path, data.startByte, data.endByte);

              // 2. Pipe the stream directly into the WebRTC DataChannel (On-The-Fly Memory Streaming)
              stream.on('data', (chunk: Buffer) => {
                // Werift DataChannel send accepts Buffer
                channel.send(chunk);
              });

              stream.on('end', () => {
                console.log(`[Worker] Stream complete for ${data.path}`);
                channel.send(JSON.stringify({ type: 'STREAM_END' }));
              });

              stream.on('error', (err) => {
                console.error(`[Worker] Rclone VFS Stream Error:`, err);
                channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message }));
              });
            }
          } catch (e) {
            // Not a JSON message, ignore
          }
        });
      };

      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer back to Relay
      socket.emit(MessageType.SDP_ANSWER, {
        type: MessageType.SDP_ANSWER,
        timestamp: Date.now(),
        senderId: socket.id,
        targetId: msg.senderId,
        sdp: pc.localDescription?.sdp
      });
      console.log(`[Worker] Sent SDP_ANSWER back to UI Client ${msg.senderId}`);

    } catch (e) {
      console.error(`[Worker] Failed to setup WebRTC Peer Connection:`, e);
    }
  });

  socket.on(MessageType.ICE_CANDIDATE, async (msg: any) => {
    console.log(`[Worker] Received ICE_CANDIDATE from ${msg.senderId}`);
    const pc = peerConnections.get(msg.senderId);
    if (pc && msg.candidate) {
      try {
        await pc.addIceCandidate(msg.candidate);
      } catch (e) {
        console.error(`[Worker] Error adding ICE candidate:`, e);
      }
    }
  });

  socket.on(MessageType.TASK_ASSIGNMENT, (msg: any) => {
    console.log(`[Worker] Received TASK_ASSIGNMENT: ${msg.taskId} (${msg.taskType})`);

    // Simulate a long running task that emits progress rapidly to test the Zustand firehose throttle
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }

      socket.emit(MessageType.TASK_PROGRESS, {
        type: MessageType.TASK_PROGRESS,
        timestamp: Date.now(),
        taskId: msg.taskId,
        workerId: socket.id,
        progress: progress,
        status: progress === 100 ? 'COMPLETE' : 'DOWNLOADING'
      });

    }, 50); // Emit incredibly fast (every 50ms) to test UI resilience
  });

  socket.on('disconnect', () => {
    console.log(`[Worker] Disconnected from Relay Server.`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`[Worker] Shutting down...`);
    rcloneManager.stop();
    socket.disconnect();
    process.exit(0);
  });
}

bootWorker();
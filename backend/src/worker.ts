import { io, Socket } from 'socket.io-client';
import { RTCPeerConnection, RTCDataChannel } from 'werift';
import { MessageType, AuthRequestMessage, FileListRequestMessage, FileListResponseMessage, RemoteListRequestMessage, RemoteListResponseMessage, GrpcDiscoveryRequestMessage, GrpcDiscoveryResponseMessage } from '@swarm/shared';
import { RcloneDaemonManager } from './RcloneDaemonManager';
import { GrpcSwarmServer } from './grpc/server';
import { GrpcSwarmClient } from './grpc/client';

const RELAY_SERVER_URL = process.env.RELAY_URL || 'http://localhost:3001';
const WORKER_SECRET = process.env.WORKER_SECRET || 'fallback_for_dev_only';
const GRPC_MODE = (process.env.GRPC_MODE as 'DIRECT' | 'RELAY') || 'DIRECT';

const rcloneManager = new RcloneDaemonManager();
const grpcServer = new GrpcSwarmServer();

async function bootWorker() {
  console.log(`[Worker] Booting up...`);

  let grpcPort = 0;

  try {
    console.log(`[Worker] Starting gRPC Server...`);
    grpcPort = await grpcServer.start();

    console.log(`[Worker] Starting Rclone Daemon...`);
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
      token: WORKER_SECRET,
      grpcPort: grpcPort, // Phase 5: Tell the Fleet Admiral our gRPC address
      grpcMode: GRPC_MODE // Phase 5.5: Tell Relay our capabilities
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

  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  socket.on(MessageType.SDP_OFFER, async (msg: any) => {
    console.log(`[Worker] Received SDP_OFFER from UI Client ${msg.senderId} for Streaming`);
    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.set(msg.senderId, pc);

      pc.connectionStateChange.subscribe((state: any) => {
        console.log(`[Worker] WebRTC State with ${msg.senderId}: ${state}`);
        if (state === 'closed' || state === 'failed') {
          peerConnections.delete(msg.senderId);
          dataChannels.delete(msg.senderId);
        }
      });

      // The backend needs to listen for its own ICE candidates and send them to the UI
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(MessageType.ICE_CANDIDATE, {
            type: MessageType.ICE_CANDIDATE,
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
        channel.onMessage.subscribe(async (buffer: any) => {
          try {
            const data = JSON.parse(buffer.toString());
            if (data.type === MessageType.STREAM_REQUEST) {
              console.log(`[Worker] Stream requested via P2P for ${data.path}`);

              // 1. First, stat the file to get its metadata
              try {
                const stat = await rcloneManager.statFile(data.fs, data.path);

                // Determine MIME type dynamically based on extension
                let mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'; // Default
                const lowerPath = data.path.toLowerCase();
                if (lowerPath.endsWith('.webm')) {
                   mimeType = 'video/webm; codecs="vp9, opus"';
                } else if (lowerPath.endsWith('.mkv')) {
                   // MKV often uses WebM's codecs or similar, but browser support varies.
                   mimeType = 'video/webm; codecs="vp9, opus"';
                }

                const metadataMsg = {
                  type: MessageType.STREAM_METADATA,
                  timestamp: Date.now(),
                  workerId: socket.id,
                  fileName: stat.Name || data.path.split('/').pop(),
                  fileSize: stat.Size || 0,
                  mimeType: mimeType
                };

                // Send metadata BEFORE starting the binary stream
                console.log(`[Worker] Sending STREAM_METADATA for ${metadataMsg.fileName} (${metadataMsg.mimeType})`);
                channel.send(JSON.stringify(metadataMsg));

              } catch (e: any) {
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
                        try { channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message })); } catch(e){}
                     }
                  });

                  for await (const chunk of stream) {
                    // Ensure the chunk is treated as a Buffer (rclone spawn stream outputs Buffers, but typing can be broad)
                    const rawChunk: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);

                    // If the browser disconnected or stream closed, abort pulling from rclone
                    if (channel.readyState !== 'open') {
                      console.log(`[Worker] WebRTC channel closed mid-stream. Aborting rclone pipe.`);
                      if ('destroy' in stream) {
                         (stream as any).destroy();
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
                           if ('destroy' in stream) (stream as any).destroy();
                           return;
                         }
                         await new Promise(resolve => setTimeout(resolve, 10)); // Yield to network I/O
                      }

                      try {
                          channel.send(slice);
                      } catch (e: any) {
                          console.error(`[Worker] WebRTC send failed:`, e);
                          try { channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: e.message })); } catch(err){}
                          if ('destroy' in stream) (stream as any).destroy();
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
                     try { channel.send(JSON.stringify({ type: 'STREAM_END' })); } catch(e){}
                  }

                } catch (err: any) {
                  console.error(`[Worker] Rclone VFS Stream Error/Abort:`, err);
                  if (channel.readyState === 'open') {
                     try { channel.send(JSON.stringify({ type: 'STREAM_ERROR', error: err.message })); } catch(e){}
                  }
                }
              };

              // Start the async processing
              processStream();
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

  // Phase 5.5: Listen for Reverse-Tunnel requests from Relay
  socket.on(MessageType.GRPC_RELAY_TRANSFER_READY as any, async (msg: any) => {
     console.log(`[Worker] Received Reverse-Tunnel request from Relay for transfer ${msg.transferId}`);
     try {
       const grpcClient = new GrpcSwarmClient(msg.relayGrpcIp, msg.relayGrpcPort);

       // In a real app, you would stream this buffer to disk using fs.createWriteStream.
       // For MVP, we'll log the receipt of the chunks.
       let totalReceived = 0;

       await grpcClient.receivePipe(
         msg.transferId,
         (chunk: Buffer) => {
           totalReceived += chunk.length;
           // process.stdout.write(`.`); // Optional visual indicator
         },
         () => {
           console.log(`\n[Worker] Reverse-Tunnel Transfer Complete! Total bytes: ${totalReceived}`);
         },
         (err) => {
           console.error(`[Worker] Reverse-Tunnel Transfer Error:`, err);
         }
       );
     } catch (e) {
       console.error(`[Worker] Failed to establish Reverse-Tunnel to Relay:`, e);
     }
  });

  socket.on(MessageType.TASK_ASSIGNMENT, async (msg: any) => {
    console.log(`[Worker] Received TASK_ASSIGNMENT: ${msg.taskId} (${msg.taskType})`);

    if (msg.taskType === 'WORKER_TO_WORKER_TRANSFER') {
      // Phase 5: Initiate a gRPC transfer to another worker
      console.log(`[Worker] Initiating gRPC Worker-to-Worker Transfer...`);
      const targetWorkerId = msg.payload.targetWorkerId;
      const fileToStream = msg.payload.file;

      // 1. Look up target worker's gRPC IP/Port via Relay Service Discovery
      const discoveryReq: GrpcDiscoveryRequestMessage = {
        type: MessageType.GRPC_DISCOVERY_REQUEST,
        timestamp: Date.now(),
        targetWorkerId: targetWorkerId
      };

      socket.emit(MessageType.GRPC_DISCOVERY_REQUEST, discoveryReq);

      // Temporary listener for the response
      const handleDiscoveryResponse = async (res: GrpcDiscoveryResponseMessage) => {
        if (res.targetWorkerId === targetWorkerId) {
          socket.off(MessageType.GRPC_DISCOVERY_RESPONSE, handleDiscoveryResponse);

          if (res.error) {
            console.error(`[Worker] Service Discovery Failed: ${res.error}`);
            return;
          }

          console.log(`[Worker] Discovered Target Worker. Routing Mode: ${res.routingMode || 'DIRECT'}, Target: ${res.ipAddress}:${res.grpcPort}`);

          try {
            // 2. Fetch the massive file from Rclone VFS
            const stream = await rcloneManager.streamFile('/', fileToStream);

            // 3. Connect gRPC Client and pipe the data!
            const grpcClient = new GrpcSwarmClient(res.ipAddress, res.grpcPort);

            // If Relay gave us a transferId, use it. Otherwise generate a local one.
            const transferId = res.transferId || `transfer_${Date.now()}`;

            const status = await grpcClient.pipeStream(transferId, stream);

            console.log(`[Worker] gRPC Transfer Complete! Payload Status:`, status);

            // Notify UI
            socket.emit(MessageType.TASK_PROGRESS, {
              type: MessageType.TASK_PROGRESS,
              timestamp: Date.now(),
              taskId: msg.taskId,
              workerId: socket.id,
              progress: 100,
              status: 'gRPC TRANSFER COMPLETE'
            });

          } catch (e) {
            console.error(`[Worker] gRPC Transfer Failed:`, e);
          }
        }
      };

      socket.on(MessageType.GRPC_DISCOVERY_RESPONSE, handleDiscoveryResponse);

    } else {
      // Standard UI task simulation
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
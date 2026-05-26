import { io, Socket } from 'socket.io-client';
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
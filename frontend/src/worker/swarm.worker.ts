import { io, Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { TaskProgressMessage, FleetStateUpdateMessage } from '@swarm/shared';

let socket: Socket | null = null;
let tasksBuffer: { [taskId: string]: { progress: number; status: string; workerId: string } } = {};
let throttleInterval: number | null = null;

const FLUSH_INTERVAL_MS = 100; // Only send updates to main thread every 100ms

const flushTasksToMain = () => {
  if (Object.keys(tasksBuffer).length > 0) {
    self.postMessage({
      type: 'TASK_PROGRESS_BATCH',
      payload: tasksBuffer
    });
    // We intentionally don't clear the buffer, we just send the latest state.
    // In a highly dynamic system, we could just send the diff to optimize further,
    // but sending the current state block is fine for the main thread to merge.
  }
};

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      if (socket) return;

      const { relayUrl, token } = payload;
      console.log(`[Web Worker] Connecting to Relay at ${relayUrl}`);

      socket = io(relayUrl);

      socket.on('connect', () => {
        self.postMessage({ type: 'SOCKET_CONNECTED' });

        socket?.emit(MessageType.AUTH_REQUEST, {
          type: MessageType.AUTH_REQUEST,
          timestamp: Date.now(),
          role: 'UI',
          token: token
        });
      });

      socket.on(MessageType.AUTH_RESPONSE, (res: { success: boolean }) => {
        if (res.success) {
           self.postMessage({ type: 'AUTH_SUCCESS' });

           // Start throttling interval after successful auth
           if (!throttleInterval) {
              // @ts-ignore - NodeJS Timer typing issues in webworker context
              throttleInterval = setInterval(flushTasksToMain, FLUSH_INTERVAL_MS);
           }
        } else {
           self.postMessage({ type: 'AUTH_FAILED' });
        }
      });

      socket.on('disconnect', () => {
        self.postMessage({ type: 'SOCKET_DISCONNECTED' });
      });

      // --- HIGH FREQUENCY MESSAGES (Handled by Worker) ---
      socket.on(MessageType.TASK_PROGRESS, (msg: TaskProgressMessage) => {
        // Accumulate in buffer instead of posting to main immediately
        tasksBuffer[msg.taskId] = {
          progress: msg.progress,
          status: msg.status,
          workerId: msg.workerId
        };
      });

      socket.on(MessageType.FLEET_STATE_UPDATE, (msg: FleetStateUpdateMessage) => {
        // Fleet updates are relatively low frequency, pass directly
        self.postMessage({
          type: MessageType.FLEET_STATE_UPDATE,
          payload: msg
        });
      });

      // --- LOW FREQUENCY / DIRECT ROUTING (Pass to Main Thread) ---
      // We pass these through to the main thread since they require UI actions
      const passThroughEvents = [
        MessageType.PONG,
        MessageType.FILE_LIST_RESPONSE,
        MessageType.REMOTE_LIST_RESPONSE,
        MessageType.CHAT_MESSAGE,
        MessageType.SDP_OFFER,
        MessageType.SDP_ANSWER,
        MessageType.ICE_CANDIDATE,
        MessageType.DB_STATE_UPDATE,
        MessageType.PUBLIC_KEY_RESPONSE,
        MessageType.WRAPPER_STATUS_UPDATE,
        MessageType.WRAPPER_2FA_CHALLENGE,
        MessageType.RIPPER_TELEMETRY,
        MessageType.APPLE_MUSIC_CONFIG_DATA
      ];

      passThroughEvents.forEach(eventType => {
        socket?.on(eventType, (data: any) => {
          self.postMessage({ type: eventType, payload: data });
        });
      });
      break;

    case 'EMIT':
      if (socket && socket.connected) {
        socket.emit(payload.event, payload.data);
      }
      break;

    case 'CLEAR_TASKS':
      tasksBuffer = {};
      self.postMessage({
        type: 'TASK_PROGRESS_BATCH',
        payload: tasksBuffer
      });
      break;

    case 'DISCONNECT':
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      if (throttleInterval) {
        clearInterval(throttleInterval);
        throttleInterval = null;
      }
      break;
  }
};

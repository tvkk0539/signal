import { MessageType, WorkerStatus, TaskType } from '../enums';

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface AuthRequestMessage extends BaseMessage {
  type: MessageType.AUTH_REQUEST;
  role: 'UI' | 'WORKER';
  token: string;
  grpcPort?: number; // Phase 5: Workers report their listening port upon boot
}

export interface GrpcDiscoveryRequestMessage extends BaseMessage {
  type: MessageType.GRPC_DISCOVERY_REQUEST;
  targetWorkerId: string;
}

export interface GrpcDiscoveryResponseMessage extends BaseMessage {
  type: MessageType.GRPC_DISCOVERY_RESPONSE;
  targetWorkerId: string;
  ipAddress: string;
  grpcPort: number;
  error?: string;
}

export interface WorkerStatusMessage extends BaseMessage {
  type: MessageType.WORKER_STATUS_UPDATE;
  workerId: string;
  status: WorkerStatus;
}

export interface TaskAssignmentMessage extends BaseMessage {
  type: MessageType.TASK_ASSIGNMENT;
  taskId: string;
  taskType: TaskType;
  payload: any;
}

export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  senderId: string;
  targetId: string;
  encryptedPayload: string;
  hasAttachment: boolean;
  isSystemMessage?: boolean;
}

export interface ChatMessageDelivered extends BaseMessage {
  type: MessageType.CHAT_MESSAGE_DELIVERED;
  messageId: string;
  targetId: string;
}

export interface FileOfferMessage extends BaseMessage {
  type: MessageType.FILE_OFFER;
  senderId: string;
  targetId: string;
  fileName: string;
  fileSizeInBytes: number;
  sdpOffer?: string; // For WebRTC P2P bypass
}

export interface SdpOfferMessage extends BaseMessage {
  type: MessageType.SDP_OFFER;
  senderId: string;
  targetId: string;
  sdp: string;
}

export interface SdpAnswerMessage extends BaseMessage {
  type: MessageType.SDP_ANSWER;
  senderId: string;
  targetId: string;
  sdp: string;
}

export interface IceCandidateMessage extends BaseMessage {
  type: MessageType.ICE_CANDIDATE;
  senderId: string;
  targetId: string;
  candidate: any;
}

export interface OfflineFileUploadRequestMessage extends BaseMessage {
  type: MessageType.OFFLINE_FILE_UPLOAD_REQUEST;
  senderId: string;
  targetId: string;
  fileName: string;
  fileSize: number;
  fileBuffer: string; // base64 encoded chunks for MVP, stream in prod
}

export interface StreamRequestMessage extends BaseMessage {
  type: MessageType.STREAM_REQUEST;
  workerId: string;
  fs: string;
  path: string;
  action: 'DOWNLOAD' | 'PLAY';
  startByte?: number;
  endByte?: number;
}

export interface StreamMetadataMessage extends BaseMessage {
  type: MessageType.STREAM_METADATA;
  workerId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FileItem {
  Path: string;
  Name: string;
  Size: number;
  MimeType: string;
  ModTime: string;
  IsDir: boolean;
  ID: string;
}

export interface FileListRequestMessage extends BaseMessage {
  type: MessageType.FILE_LIST_REQUEST;
  workerId: string;
  directory: string;
  fs?: string;
}

export interface FileListResponseMessage extends BaseMessage {
  type: MessageType.FILE_LIST_RESPONSE;
  workerId: string;
  directory: string;
  fs?: string;
  files: FileItem[];
  error?: string;
}

export interface FleetStateUpdateMessage extends BaseMessage {
  type: MessageType.FLEET_STATE_UPDATE;
  workers: string[];
}

export interface RemoteItem {
  name: string;
  type: string;
}

export interface RemoteListRequestMessage extends BaseMessage {
  type: MessageType.REMOTE_LIST_REQUEST;
  workerId: string;
}

export interface RemoteListResponseMessage extends BaseMessage {
  type: MessageType.REMOTE_LIST_RESPONSE;
  workerId: string;
  remotes: RemoteItem[];
  error?: string;
}

export interface BatchTaskRequestMessage extends BaseMessage {
  type: MessageType.BATCH_TASK_REQUEST;
  tasks: Array<{ id: string; action: string; payload: any }>;
}

export interface TaskProgressMessage extends BaseMessage {
  type: MessageType.TASK_PROGRESS;
  taskId: string;
  workerId: string;
  progress: number;
  status: string;
}

export interface JobAuditLog {
  id?: string;
  jobId: string;
  workerId: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  bytesTransferred?: number;
  timestamp: Date;
}

export interface DbStateRequestMessage extends BaseMessage {
  type: MessageType.DB_STATE_REQUEST;
}

export interface DbRouteSwitchRequestMessage extends BaseMessage {
  type: MessageType.DB_ROUTE_SWITCH_REQUEST;
  domain: 'AUTH' | 'AUDIT' | 'CHAT';
  engine: 'MONGODB' | 'POSTGRES' | 'SUPABASE' | 'FIREBASE' | 'SQLITE' | 'MOCK';
  connectionString?: string;
  apiKey?: string;
  mirrors?: Array<{ engine: string; connectionString?: string; apiKey?: string }>;
}

export interface DbStateUpdateMessage extends BaseMessage {
  type: MessageType.DB_STATE_UPDATE;
  routing: Record<string, {
    primary: { engine: string; connectionString?: string; apiKey?: string },
    mirrors: Array<{ engine: string; connectionString?: string; apiKey?: string }>
  }>;
}

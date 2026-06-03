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
  grpcMode?: 'DIRECT' | 'RELAY'; // Phase 5.5: Worker's capability
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
  routingMode?: 'DIRECT' | 'RELAYED';
  transferId?: string; // Provided by relay when routingMode is RELAYED
  error?: string;
}

export interface GrpcRelayTransferReadyMessage extends BaseMessage {
  type: MessageType.GRPC_RELAY_TRANSFER_READY; // We will add this to enums
  transferId: string;
  relayGrpcIp: string;
  relayGrpcPort: number;
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
  domain: 'AUTH' | 'AUDIT' | 'CHAT' | 'APPLE_MUSIC' | 'VFS_PERMANENT' | 'VFS_EPHEMERAL';
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

export interface PublicKeyAnnounceMessage extends BaseMessage {
  type: MessageType.PUBLIC_KEY_ANNOUNCE;
  userId: string;
  publicKeyBase64: string;
}

export interface PublicKeyRequestMessage extends BaseMessage {
  type: MessageType.PUBLIC_KEY_REQUEST;
  targetId: string;
}

export interface PublicKeyResponseMessage extends BaseMessage {
  type: MessageType.PUBLIC_KEY_RESPONSE;
  targetId: string;
  publicKeyBase64: string | null;
}

// --- Phase 9: Media Ingestion Interfaces ---

export interface WrapperProfile {
  id: string;
  name: string;
  username: string;
  timestamp: number;
}

export interface WrapperProfilesRequestMessage extends BaseMessage {
  type: MessageType.WRAPPER_PROFILES_REQUEST;
}

export interface WrapperProfilesListMessage extends BaseMessage {
  type: MessageType.WRAPPER_PROFILES_LIST;
  profiles: WrapperProfile[];
}

export interface WrapperStateDeleteMessage extends BaseMessage {
  type: MessageType.WRAPPER_STATE_DELETE;
  profileId: string;
}

export interface WrapperStartRequestMessage extends BaseMessage {
  type: MessageType.WRAPPER_START_REQUEST;
  workerId: string;
  username?: string;
  password?: string;
  profileId?: string;
  profileName?: string;
}

export interface WrapperStopRequestMessage extends BaseMessage {
  type: MessageType.WRAPPER_STOP_REQUEST;
  workerId: string;
  profileId?: string; // Inform the backend which profile it's stopping
}

export interface Wrapper2FAChallengeMessage extends BaseMessage {
  type: MessageType.WRAPPER_2FA_CHALLENGE;
  workerId: string;
}

export interface Wrapper2FASubmitMessage extends BaseMessage {
  type: MessageType.WRAPPER_2FA_SUBMIT;
  workerId: string;
  code: string;
}

export interface WrapperStatusUpdateMessage extends BaseMessage {
  type: MessageType.WRAPPER_STATUS_UPDATE;
  workerId: string;
  installed: boolean;
  running: boolean;
  pid: number | null;
  logs: string[];
}

export interface AppleMusicRipRequestMessage extends BaseMessage {
  type: MessageType.APPLE_MUSIC_RIP_REQUEST;
  workerId: string;
  jobId: string;
  url: string;
  ripMode?: 'auto' | 'song' | 'album' | 'artist' | 'mv';
  format: 'alac' | 'flac' | 'atmos' | 'aac';
  qualityLimit: '192000' | '96000' | '48000';
  embedLrc: boolean;
  animatedArt: boolean;
  saveM3u8Playlist?: boolean;
  printJson?: boolean;
  debugMode?: boolean;
  mediaUserToken: string;
  storefront: string;
  autoUpload?: boolean;
  rcloneRemote?: string;
  lrcFormat?: 'lrc' | 'ttml';
  lrcType?: 'lyrics' | 'syllable-lyrics';
  language?: string;
  tagSortOrder?: boolean;
  saveLrcFile?: boolean;
  saveArtistCover?: boolean;
  useSongInfoForPlaylist?: boolean;
  alacFix?: boolean;
  coverSize?: string;
  coverFormat?: 'jpg' | 'png' | 'original';
  explicitChoice?: string;
  cleanChoice?: string;
  appleMasterChoice?: string;
  albumFolderFormat?: string;
  playlistFolderFormat?: string;
  songFileFormat?: string;
  artistFolderFormat?: string;
  maxMemoryLimit?: number;
  exitOnError?: boolean;
  getM3u8Mode?: 'all' | 'hires';
  aacType?: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix';
  mvAudioType?: 'atmos' | 'ac3' | 'aac';
  mvMax?: number;
  limitMax?: number;
  dlAlbumcoverForPlaylist?: boolean;
  embyAnimatedArtwork?: boolean;
  convertAfterDownload?: boolean;
  convertFormat?: string;
  convertKeepOriginal?: boolean;
  convertSkipIfSourceMatches?: boolean;
  convertWithMetadata?: boolean;
  convertWarnLossyToLossless?: boolean;
  convertSkipLossyToLossless?: boolean;
  convertCheckBadAlac?: boolean;
  convertDeleteBadAlac?: boolean;
}

export interface RipperTelemetryMessage extends BaseMessage {
  type: MessageType.RIPPER_TELEMETRY;
  workerId: string;
  jobId: string;
  log: string;
}

export interface RipperProgressUpdateMessage extends BaseMessage {
  type: MessageType.RIPPER_PROGRESS_UPDATE;
  workerId: string;
  jobId: string;
  phase: string;
  progressPercent: number;
  speed: string;
  dataMetrics: string;
}

export interface AppleMusicConfigSaveMessage extends BaseMessage {
  type: MessageType.APPLE_MUSIC_CONFIG_SAVE;
  mediaUserToken: string;
  storefront: string;
  alacFix: boolean;
  autoUpload: boolean;
  rcloneRemote: string;
  lrcFormat: 'lrc' | 'ttml';
  lrcType: 'lyrics' | 'syllable-lyrics';
  language: string;
  tagSortOrder: boolean;
  saveLrcFile: boolean;
  saveArtistCover: boolean;
  useSongInfoForPlaylist: boolean;
  coverSize?: string;
  coverFormat?: 'jpg' | 'png' | 'original';
  explicitChoice?: string;
  cleanChoice?: string;
  appleMasterChoice?: string;
  albumFolderFormat?: string;
  playlistFolderFormat?: string;
  songFileFormat?: string;
  artistFolderFormat?: string;
  maxMemoryLimit?: number;
  exitOnError?: boolean;
  getM3u8Mode?: 'all' | 'hires';
  aacType?: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix';
  mvAudioType?: 'atmos' | 'ac3' | 'aac';
  mvMax?: number;
  limitMax?: number;
  dlAlbumcoverForPlaylist?: boolean;
  embyAnimatedArtwork?: boolean;
  convertAfterDownload?: boolean;
  convertFormat?: string;
  convertKeepOriginal?: boolean;
  convertSkipIfSourceMatches?: boolean;
  convertWithMetadata?: boolean;
  convertWarnLossyToLossless?: boolean;
  convertSkipLossyToLossless?: boolean;
  convertCheckBadAlac?: boolean;
  convertDeleteBadAlac?: boolean;
}

export interface AppleMusicCancelRequestMessage extends BaseMessage {
  type: MessageType.APPLE_MUSIC_CANCEL_REQUEST;
  workerId: string;
  jobId: string;
}

export interface WrapperStateSaveMessage extends BaseMessage {
  type: MessageType.WRAPPER_STATE_SAVE;
  payload: string;
  workerId: string;
  profileId?: string;
  profileName?: string;
  username?: string;
}

export interface WrapperStateLoadMessage extends BaseMessage {
  type: MessageType.WRAPPER_STATE_LOAD;
  workerId: string;
  profileId: string;
}

export interface WrapperStateDataMessage extends BaseMessage {
  type: MessageType.WRAPPER_STATE_DATA;
  payload: string | null;
  workerId: string;
}

export interface VfsSearchRequestMessage extends BaseMessage {
  type: MessageType.VFS_SEARCH_REQUEST;
  query: string;
  limit: number;
  remoteAlias?: string; // Optional filter
}

export interface VfsSearchResponseMessage extends BaseMessage {
  type: MessageType.VFS_SEARCH_RESPONSE;
  query: string;
  results: any[];
}

export interface VfsConfigSaveMessage extends BaseMessage {
  type: MessageType.VFS_CONFIG_SAVE;
  alias: string;
  rcloneName: string;
  configText: string;
  isEphemeral: boolean;
}

export interface VfsConfigDeleteMessage extends BaseMessage {
  type: MessageType.VFS_CONFIG_DELETE;
  alias: string;
  isEphemeral: boolean;
}

export interface VfsIndexRequestMessage extends BaseMessage {
  type: MessageType.VFS_INDEX_REQUEST;
  workerId: string; // The specific worker to execute the massive bypass scan
  remoteAlias: string;
  rcloneName: string;
  isEphemeral: boolean;
}

export interface VfsConfigRebootMessage extends BaseMessage {
  type: MessageType.VFS_CONFIG_REBOOT;
  workerId: string;
  permanentBlocks: any[];
  ephemeralBlocks: any[];
}

export interface VfsAliasListRequestMessage extends BaseMessage {
  type: MessageType.VFS_ALIAS_LIST_REQUEST;
}

export interface VfsAliasListResponseMessage extends BaseMessage {
  type: MessageType.VFS_ALIAS_LIST_RESPONSE;
  aliases: string[];
}

export interface AppleMusicConfigDataMessage extends BaseMessage {
  type: MessageType.APPLE_MUSIC_CONFIG_DATA;
  mediaUserToken: string;
  storefront: string;
  alacFix: boolean;
  autoUpload: boolean;
  rcloneRemote: string;
  lrcFormat: 'lrc' | 'ttml';
  lrcType: 'lyrics' | 'syllable-lyrics';
  language: string;
  tagSortOrder: boolean;
  saveLrcFile: boolean;
  saveArtistCover: boolean;
  useSongInfoForPlaylist: boolean;
  coverSize?: string;
  coverFormat?: 'jpg' | 'png' | 'original';
  explicitChoice?: string;
  cleanChoice?: string;
  appleMasterChoice?: string;
  albumFolderFormat?: string;
  playlistFolderFormat?: string;
  songFileFormat?: string;
  artistFolderFormat?: string;
  maxMemoryLimit?: number;
  exitOnError?: boolean;
  getM3u8Mode?: 'all' | 'hires';
  aacType?: 'aac-lc' | 'aac' | 'aac-binaural' | 'aac-downmix';
  mvAudioType?: 'atmos' | 'ac3' | 'aac';
  mvMax?: number;
  limitMax?: number;
  dlAlbumcoverForPlaylist?: boolean;
  embyAnimatedArtwork?: boolean;
  convertAfterDownload?: boolean;
  convertFormat?: string;
  convertKeepOriginal?: boolean;
  convertSkipIfSourceMatches?: boolean;
  convertWithMetadata?: boolean;
  convertWarnLossyToLossless?: boolean;
  convertSkipLossyToLossless?: boolean;
  convertCheckBadAlac?: boolean;
  convertDeleteBadAlac?: boolean;
}

export interface FileDeleteRequestMessage extends BaseMessage {
  type: MessageType.FILE_DELETE_REQUEST;
  workerId: string;
  fs: string;
  paths: string[];
}

export interface FileMoveRequestMessage extends BaseMessage {
  type: MessageType.FILE_MOVE_REQUEST;
  workerId: string;
  srcFs: string;
  dstFs: string;
  paths: { src: string, dst: string }[];
}

export interface FileCopyRequestMessage extends BaseMessage {
  type: MessageType.FILE_COPY_REQUEST;
  workerId: string;
  srcFs: string;
  dstFs: string;
  paths: { src: string, dst: string }[];
}

export interface FileRenameRequestMessage extends BaseMessage {
  type: MessageType.FILE_RENAME_REQUEST;
  workerId: string;
  fs: string;
  srcPath: string;
  dstPath: string;
}

export interface FileActionResponseMessage extends BaseMessage {
  type: MessageType.FILE_ACTION_RESPONSE;
  success: boolean;
  action: 'DELETE' | 'MOVE' | 'COPY' | 'RENAME';
  message: string;
  error?: string;
}

import { MessageType, WorkerStatus, TaskType } from '../enums';
export interface BaseMessage {
    type: MessageType;
    timestamp: number;
}
export interface AuthRequestMessage extends BaseMessage {
    type: MessageType.AUTH_REQUEST;
    role: 'UI' | 'WORKER';
    token: string;
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
}
export interface FileOfferMessage extends BaseMessage {
    type: MessageType.FILE_OFFER;
    senderId: string;
    targetId: string;
    fileName: string;
    fileSizeInBytes: number;
    sdpOffer: string;
}

export declare enum WorkerStatus {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
    BUSY = "BUSY",
    ERROR = "ERROR"
}
export declare enum TaskType {
    DOWNLOAD = "DOWNLOAD",
    UPLOAD = "UPLOAD",
    SYNC = "SYNC",
    SCAN = "SCAN"
}
export declare enum MessageType {
    AUTH_REQUEST = "AUTH_REQUEST",
    AUTH_RESPONSE = "AUTH_RESPONSE",
    WORKER_STATUS_UPDATE = "WORKER_STATUS_UPDATE",
    TASK_ASSIGNMENT = "TASK_ASSIGNMENT",
    TASK_PROGRESS = "TASK_PROGRESS",
    TASK_COMPLETE = "TASK_COMPLETE",
    PING = "PING",
    PONG = "PONG"
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = exports.TaskType = exports.WorkerStatus = void 0;
var WorkerStatus;
(function (WorkerStatus) {
    WorkerStatus["ONLINE"] = "ONLINE";
    WorkerStatus["OFFLINE"] = "OFFLINE";
    WorkerStatus["BUSY"] = "BUSY";
    WorkerStatus["ERROR"] = "ERROR";
})(WorkerStatus || (exports.WorkerStatus = WorkerStatus = {}));
var TaskType;
(function (TaskType) {
    TaskType["DOWNLOAD"] = "DOWNLOAD";
    TaskType["UPLOAD"] = "UPLOAD";
    TaskType["SYNC"] = "SYNC";
    TaskType["SCAN"] = "SCAN";
})(TaskType || (exports.TaskType = TaskType = {}));
var MessageType;
(function (MessageType) {
    MessageType["AUTH_REQUEST"] = "AUTH_REQUEST";
    MessageType["AUTH_RESPONSE"] = "AUTH_RESPONSE";
    MessageType["WORKER_STATUS_UPDATE"] = "WORKER_STATUS_UPDATE";
    MessageType["TASK_ASSIGNMENT"] = "TASK_ASSIGNMENT";
    MessageType["TASK_PROGRESS"] = "TASK_PROGRESS";
    MessageType["TASK_COMPLETE"] = "TASK_COMPLETE";
    MessageType["PING"] = "PING";
    MessageType["PONG"] = "PONG";
    MessageType["CHAT_MESSAGE"] = "CHAT_MESSAGE";
    MessageType["CHAT_TYPING"] = "CHAT_TYPING";
    MessageType["FILE_OFFER"] = "FILE_OFFER";
})(MessageType || (exports.MessageType = MessageType = {}));

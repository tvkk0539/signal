"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicatedChatRepository = void 0;
class ReplicatedChatRepository {
    primary;
    mirrors;
    constructor(primary, mirrors = []) {
        this.primary = primary;
        this.mirrors = mirrors;
    }
    async saveMessage(message) {
        await this.primary.saveMessage(message);
        this.mirrors.forEach(mirror => {
            mirror.saveMessage(message).catch(err => {
                console.error(`[Replication Engine] Mirror write failed for ChatMessage ${message.timestamp}:`, err);
            });
        });
    }
    async getMessages(userId1, userId2, limit) {
        return this.primary.getMessages(userId1, userId2, limit);
    }
}
exports.ReplicatedChatRepository = ReplicatedChatRepository;

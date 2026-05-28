"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresChatRepository = void 0;
class PostgresChatRepository {
    connectionString;
    constructor(connectionString) {
        this.connectionString = connectionString || '';
        console.log(`[Postgres] Initialized Chat Repository mapping.`);
    }
    async saveMessage(message) {
        console.log(`[Postgres] (Stub) saveMessage from ${message.senderId}`);
    }
    async getMessages(userId1, userId2, limit) {
        return [];
    }
}
exports.PostgresChatRepository = PostgresChatRepository;

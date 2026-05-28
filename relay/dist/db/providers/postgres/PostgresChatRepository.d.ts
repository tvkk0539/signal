import { IChatRepository } from '../../interfaces/IChatRepository';
import type { ChatMessage } from '@swarm/shared';
export declare class PostgresChatRepository implements IChatRepository {
    private connectionString;
    constructor(connectionString?: string);
    saveMessage(message: ChatMessage): Promise<void>;
    getMessages(userId1: string, userId2: string, limit?: number): Promise<ChatMessage[]>;
}

import { IChatRepository } from '../interfaces/IChatRepository';
import { ChatMessage } from '@swarm/shared';
export declare class ReplicatedChatRepository implements IChatRepository {
    private primary;
    private mirrors;
    constructor(primary: IChatRepository, mirrors?: IChatRepository[]);
    saveMessage(message: ChatMessage): Promise<void>;
    getMessages(userId1: string, userId2: string, limit?: number): Promise<ChatMessage[]>;
}

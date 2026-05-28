import type { ChatMessage } from '@swarm/shared';

export interface IChatRepository {
  saveMessage(message: ChatMessage): Promise<void>;
  getMessages(userId1: string, userId2: string, limit?: number): Promise<ChatMessage[]>;
}
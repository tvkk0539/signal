import { IChatRepository } from '../../interfaces/IChatRepository';
import type { ChatMessage } from '@swarm/shared';

export class PostgresChatRepository implements IChatRepository {
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || '';
    console.log(`[Postgres] Initialized Chat Repository mapping.`);
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    console.log(`[Postgres] (Stub) saveMessage from ${message.senderId}`);
  }

  async getMessages(userId1: string, userId2: string, limit?: number): Promise<ChatMessage[]> {
    return [];
  }
}

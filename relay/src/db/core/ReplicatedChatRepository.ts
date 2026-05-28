import { IChatRepository } from '../interfaces/IChatRepository';
import { ChatMessage } from '@swarm/shared';

export class ReplicatedChatRepository implements IChatRepository {
  constructor(
    private primary: IChatRepository,
    private mirrors: IChatRepository[] = []
  ) {}

  async saveMessage(message: ChatMessage): Promise<void> {
    await this.primary.saveMessage(message);

    this.mirrors.forEach(mirror => {
      mirror.saveMessage(message).catch(err => {
        console.error(`[Replication Engine] Mirror write failed for ChatMessage ${message.timestamp}:`, err);
      });
    });
  }

  async getMessages(userId1: string, userId2: string, limit?: number): Promise<ChatMessage[]> {
    return this.primary.getMessages(userId1, userId2, limit);
  }
}

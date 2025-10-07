import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';

@Injectable()
export class MessagesService {
  constructor(@InjectModel(Message.name) private messageModel: Model<Message>) {}

  async getChannelMessages(channelId: string, limit = 50, skip = 0, joinedAt?: Date) {
    const query: any = { channelId };

    // Only show messages sent after the user joined
    if (joinedAt) {
      query.createdAt = { $gte: joinedAt };
    }

    return this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('sender', 'username email')
      .exec();
  }

  async getDirectMessages(userId1: string, userId2: string, limit = 50, skip = 0) {
    return this.messageModel
      .find({
        $or: [
          { sender: userId1, recipientId: userId2 },
          { sender: userId2, recipientId: userId1 },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('sender', 'username email')
      .populate('recipientId', 'username email')
      .exec();
  }

  async searchMessages(query: string, userId: string) {
    return this.messageModel
      .find({
        $or: [{ sender: userId }, { recipientId: userId }],
        content: { $regex: query, $options: 'i' },
      })
      .populate('sender', 'username email')
      .populate('recipientId', 'username email')
      .populate('channelId', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }
}

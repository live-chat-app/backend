import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async getUnreadCounts(userId: string) {
    // Convert userId string to ObjectId for proper comparison
    const userObjectId = new Types.ObjectId(userId);

    // Get unread direct messages count per user
    // A message is unread if the userId is NOT in the readBy array
    const directMessages = await this.messageModel.aggregate([
      {
        $match: {
          recipientId: userObjectId,
          readBy: { $not: { $elemMatch: { userId: userObjectId } } },
        },
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get unread channel messages count per channel
    const channelMessages = await this.messageModel.aggregate([
      {
        $match: {
          channelId: { $exists: true, $ne: null },
          sender: { $ne: userObjectId },
          readBy: { $not: { $elemMatch: { userId: userObjectId } } },
        },
      },
      {
        $group: {
          _id: '$channelId',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      directMessages: directMessages.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
      }, {}),
      channelMessages: channelMessages.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
      }, {}),
    };
  }

  async getLastMessageTimes(userId: string) {
    // Get last message time for each user in direct messages
    const directMessagesUsers = await this.messageModel.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { recipientId: userId }],
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$recipientId',
              else: '$sender',
            },
          },
        },
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessageTime: { $max: '$createdAt' },
        },
      },
    ]);

    // Get last message time for each channel
    const channelMessages = await this.messageModel.aggregate([
      {
        $match: {
          channelId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$channelId',
          lastMessageTime: { $max: '$createdAt' },
        },
      },
    ]);

    return {
      users: directMessagesUsers.reduce((acc, item) => {
        acc[item._id.toString()] = item.lastMessageTime;
        return acc;
      }, {}),
      channels: channelMessages.reduce((acc, item) => {
        acc[item._id.toString()] = item.lastMessageTime;
        return acc;
      }, {}),
    };
  }
}

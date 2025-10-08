import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel } from './channel.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<Channel>,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  async create(createChannelDto: CreateChannelDto, userId: string) {
    const channel = await this.channelModel.create({
      ...createChannelDto,
      createdBy: userId,
      members: [{ userId, joinedAt: new Date() }],
    });
    const populatedChannel = await channel.populate('createdBy', 'username email');

    // Broadcast new channel to all connected users
    this.chatGateway.server.emit('newChannel', populatedChannel);

    return populatedChannel;
  }

  async findAll() {
    return this.channelModel
      .find({ isPrivate: false })
      .populate('createdBy', 'username email')
      .populate('members.userId', 'username email')
      .exec();
  }

  async findUserChannels(userId: string) {
    return this.channelModel
      .find({ 'members.userId': userId })
      .populate('createdBy', 'username email')
      .populate('members.userId', 'username email')
      .exec();
  }

  async findById(id: string) {
    const channel = await this.channelModel
      .findById(id)
      .populate('createdBy', 'username email')
      .populate('members.userId', 'username email')
      .exec();

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async addMember(channelId: string, userId: string) {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const isMember = channel.members.some((m) => m.userId.toString() === userId);
    if (!isMember) {
      channel.members.push({ userId: userId as any, joinedAt: new Date() });
      await channel.save();
    }

    return channel.populate('members.userId', 'username email');
  }

  async removeMember(channelId: string, userId: string) {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    channel.members = channel.members.filter((m) => m.userId.toString() !== userId);
    await channel.save();

    return channel.populate('members.userId', 'username email');
  }

  async getMemberJoinedAt(channelId: string, userId: string): Promise<Date | null> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      return null;
    }

    const member = channel.members.find((m) => m.userId.toString() === userId);
    return member ? member.joinedAt : null;
  }
}

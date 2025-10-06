import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel } from './channel.schema';
import { CreateChannelDto } from './dto/create-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(@InjectModel(Channel.name) private channelModel: Model<Channel>) {}

  async create(createChannelDto: CreateChannelDto, userId: string) {
    const channel = await this.channelModel.create({
      ...createChannelDto,
      createdBy: userId,
      members: [userId],
    });
    return channel.populate('createdBy', 'username email');
  }

  async findAll() {
    return this.channelModel
      .find({ isPrivate: false })
      .populate('createdBy', 'username email')
      .populate('members', 'username email')
      .exec();
  }

  async findUserChannels(userId: string) {
    return this.channelModel
      .find({ members: userId })
      .populate('createdBy', 'username email')
      .populate('members', 'username email')
      .exec();
  }

  async findById(id: string) {
    const channel = await this.channelModel
      .findById(id)
      .populate('createdBy', 'username email')
      .populate('members', 'username email')
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

    if (!channel.members.includes(userId as any)) {
      channel.members.push(userId as any);
      await channel.save();
    }

    return channel.populate('members', 'username email');
  }

  async removeMember(channelId: string, userId: string) {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    channel.members = channel.members.filter((m) => m.toString() !== userId);
    await channel.save();

    return channel.populate('members', 'username email');
  }
}

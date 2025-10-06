import { Controller, Get, Post, Body, Param, UseGuards, ValidationPipe, Delete } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.schema';
import { CreateChannelDto } from './dto/create-channel.dto';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  async create(@Body(ValidationPipe) createChannelDto: CreateChannelDto, @CurrentUser() user: any) {
    return this.channelsService.create(createChannelDto, user._id.toString());
  }

  @Get()
  async findAll() {
    return this.channelsService.findAll();
  }

  @Get('my-channels')
  async findUserChannels(@CurrentUser() user: any) {
    return this.channelsService.findUserChannels(user._id.toString());
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.channelsService.findById(id);
  }

  @Post(':id/join')
  async joinChannel(@Param('id') channelId: string, @CurrentUser() user: any) {
    return this.channelsService.addMember(channelId, user._id.toString());
  }

  @Delete(':id/leave')
  async leaveChannel(@Param('id') channelId: string, @CurrentUser() user: any) {
    return this.channelsService.removeMember(channelId, user._id.toString());
  }
}

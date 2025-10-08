import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ChannelsService } from '../channels/channels.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.schema';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private channelsService: ChannelsService,
  ) {}

  @Get('channel/:channelId')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    // Get when the user joined the channel
    const joinedAt = await this.channelsService.getMemberJoinedAt(channelId, user._id.toString());
    return this.messagesService.getChannelMessages(channelId, limit, skip, joinedAt || undefined);
  }

  @Get('direct/:userId')
  async getDirectMessages(
    @Param('userId') otherUserId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.messagesService.getDirectMessages(user._id.toString(), otherUserId, limit, skip);
  }

  @Get('search')
  async searchMessages(@Query('q') query: string, @CurrentUser() user: any) {
    return this.messagesService.searchMessages(query, user._id.toString());
  }

  @Get('unread-counts')
  async getUnreadCounts(@CurrentUser() user: any) {
    return this.messagesService.getUnreadCounts(user._id.toString());
  }

  @Get('last-message-times')
  async getLastMessageTimes(@CurrentUser() user: any) {
    return this.messagesService.getLastMessageTimes(user._id.toString());
  }
}

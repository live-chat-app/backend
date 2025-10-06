import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.schema';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('channel/:channelId')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.messagesService.getChannelMessages(channelId, limit, skip);
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
}

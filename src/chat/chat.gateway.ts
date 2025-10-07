import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/user.schema';
import { Message } from '../messages/message.schema';
import { Channel } from '../channels/channel.schema';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Channel.name) private channelModel: Model<Channel>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userModel.findById(payload.sub);

      if (!user) {
        client.disconnect();
        return;
      }

      // Update user status
      await this.userModel.findByIdAndUpdate(user._id, {
        isOnline: true,
        socketId: client.id,
      });

      client.data.userId = (user as any)._id.toString();
      client.data.username = user.username;

      // Notify all clients about user online status
      this.server.emit('userStatusChange', {
        userId: user._id,
        username: user.username,
        isOnline: true,
      });

      console.log(`User connected: ${user.username} (${client.id})`);
    } catch (error) {
      console.error('Connection error:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;
      if (userId) {
        const user = await this.userModel.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
          socketId: null,
        });

        if (user) {
          this.server.emit('userStatusChange', {
            userId: user._id,
            username: user.username,
            isOnline: false,
            lastSeen: new Date(),
          });
        }

        console.log(`User disconnected: ${client.data.username}`);
      }
    } catch (error) {
      console.error('Disconnect error:', error.message);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      const userId = client.data.userId;

      // Create message
      const message = await this.messageModel.create({
        sender: userId,
        content: data.content,
        channelId: data.channelId || null,
        recipientId: data.recipientId || null,
        type: data.type || 'text',
        fileUrl: data.fileUrl || null,
      });

      // Populate sender info
      const populatedMessage = await this.messageModel
        .findById(message._id)
        .populate('sender', 'username email')
        .populate('recipientId', 'username email');

      // Send to channel or direct message
      if (data.channelId) {
        // Emit to everyone in the channel (this includes the sender if they're in the room)
        this.server.to(data.channelId).emit('newMessage', populatedMessage);
      } else if (data.recipientId) {
        // Find recipient socket
        const recipient = await this.userModel.findById(data.recipientId);
        if (recipient && recipient.socketId) {
          this.server.to(recipient.socketId).emit('newMessage', populatedMessage);
        }
        // Also send back to sender
        client.emit('newMessage', populatedMessage);
      }

      return { success: true, message: populatedMessage };
    } catch (error) {
      console.error('Send message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const userId = client.data.userId;
      const channel = await this.channelModel.findById(data.channelId);

      if (!channel) {
        return { success: false, error: 'Channel not found' };
      }

      // Add user to channel members if not already
      const isMember = channel.members.some((m) => m.userId.toString() === userId);
      if (!isMember) {
        channel.members.push({ userId: userId as any, joinedAt: new Date() });
        await channel.save();
      }

      client.join(data.channelId);

      // Notify channel members
      this.server.to(data.channelId).emit('userJoinedChannel', {
        channelId: data.channelId,
        userId,
        username: client.data.username,
      });

      return { success: true };
    } catch (error) {
      console.error('Join channel error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      client.leave(data.channelId);
      return { success: true };
    } catch (error) {
      console.error('Leave channel error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId?: string; recipientId?: string; isTyping: boolean },
  ) {
    try {
      const typingData = {
        userId: client.data.userId,
        username: client.data.username,
        isTyping: data.isTyping,
      };

      if (data.channelId) {
        client.to(data.channelId).emit('userTyping', { ...typingData, channelId: data.channelId });
      } else if (data.recipientId) {
        const recipient = await this.userModel.findById(data.recipientId);
        if (recipient && recipient.socketId) {
          this.server.to(recipient.socketId).emit('userTyping', typingData);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Typing error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('messageReaction')
  async handleMessageReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messageModel.findById(data.messageId);

      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        (r) => r.userId.toString() === userId && r.emoji === data.emoji,
      );

      if (existingReaction) {
        // Remove reaction
        message.reactions = message.reactions.filter(
          (r) => !(r.userId.toString() === userId && r.emoji === data.emoji),
        );
      } else {
        // Add reaction
        message.reactions.push({ userId, emoji: data.emoji });
      }

      await message.save();

      // Emit to all relevant users
      if (message.channelId) {
        this.server.to(message.channelId.toString()).emit('messageReactionUpdate', {
          messageId: message._id,
          reactions: message.reactions,
        });
      } else if (message.recipientId) {
        const recipient = await this.userModel.findById(message.recipientId);
        if (recipient && recipient.socketId) {
          this.server.to(recipient.socketId).emit('messageReactionUpdate', {
            messageId: message._id,
            reactions: message.reactions,
          });
        }
        client.emit('messageReactionUpdate', {
          messageId: message._id,
          reactions: message.reactions,
        });
      }

      return { success: true, reactions: message.reactions };
    } catch (error) {
      console.error('Message reaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messageModel.findById(data.messageId);

      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if already read
      const alreadyRead = message.readBy.some((r) => r.userId.toString() === userId);
      if (!alreadyRead) {
        message.readBy.push({ userId, readAt: new Date() });
        await message.save();

        // Notify sender about read receipt
        const sender = await this.userModel.findById(message.sender);
        if (sender && sender.socketId) {
          this.server.to(sender.socketId).emit('messageRead', {
            messageId: message._id,
            readBy: userId,
            readAt: new Date(),
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Mark as read error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

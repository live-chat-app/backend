import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ required: false, default: '' })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  channelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  recipientId: Types.ObjectId;

  @Prop({ default: 'text', enum: ['text', 'file', 'image'] })
  type: string;

  @Prop()
  fileUrl: string;

  @Prop({ type: [{ userId: Types.ObjectId, readAt: Date }], default: [] })
  readBy: { userId: Types.ObjectId; readAt: Date }[];

  @Prop({ type: [{ userId: Types.ObjectId, emoji: String }], default: [] })
  reactions: { userId: Types.ObjectId; emoji: string }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

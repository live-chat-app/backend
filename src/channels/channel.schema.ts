import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Channel extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      joinedAt: { type: Date, default: Date.now }
    }],
    default: []
  })
  members: { userId: Types.ObjectId; joinedAt: Date }[];

  @Prop({ default: false })
  isPrivate: boolean;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

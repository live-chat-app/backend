import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findAll() {
    return this.userModel.find().select('-password').exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  async findOnlineUsers() {
    return this.userModel.find({ isOnline: true }).select('-password').exec();
  }

  async searchUsers(query: string) {
    return this.userModel
      .find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password')
      .exec();
  }
}

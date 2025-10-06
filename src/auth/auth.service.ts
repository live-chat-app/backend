import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userModel.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = this.generateToken(user);

    // Broadcast new user to all connected clients
    if (this.chatGateway && this.chatGateway.server) {
      this.chatGateway.server.emit('newUser', {
        _id: user._id,
        username: user.username,
        email: user.email,
        isOnline: false,
      });
    }

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
      },
      token,
    };
  }

  private generateToken(user: User) {
    const payload = { sub: user._id, username: user.username, email: user.email };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    return this.userModel.findById(userId);
  }
}

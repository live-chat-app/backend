import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateChannelDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

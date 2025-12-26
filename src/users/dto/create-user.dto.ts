import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsNumber()
  telegram_id: number;

  @IsNumber()
  chat_id: number;

  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  card?: string;

  @IsOptional()
  @IsString()
  card_owner?: string;

  @IsOptional()
  @IsNumber()
  group_id?: number;

  @IsOptional()
  @IsBoolean()
  is_registered?: boolean;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean;
}
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetUsersDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
 search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  group_id?: number;
}
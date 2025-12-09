import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule } from '../database/database.module';
import { AuthMiddleware } from '../common/middleware/auth.middleware';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService, UsersRepository, AuthMiddleware],
  exports: [UsersService, AuthMiddleware],
})
export class UsersModule {}

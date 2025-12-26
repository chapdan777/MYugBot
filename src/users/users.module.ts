import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthMiddleware } from '../common/middleware/auth.middleware';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, AuthMiddleware],
  exports: [UsersService, AuthMiddleware],
})
export class UsersModule {}

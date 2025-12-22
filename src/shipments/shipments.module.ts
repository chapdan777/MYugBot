import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsRepository } from './shipments.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ShipmentsService, ShipmentsRepository],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}

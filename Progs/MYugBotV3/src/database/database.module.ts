import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Глобальный модуль для работы с ITM Database (Firebird)
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

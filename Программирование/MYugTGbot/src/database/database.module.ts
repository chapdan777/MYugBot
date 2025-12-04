import { Module, Global } from '@nestjs/common';
import { FirebirdService } from './firebird.service';

/**
 * Модуль для работы с базами данных Firebird (ITM и CUBIC)
 */
@Global()
@Module({
  providers: [FirebirdService],
  exports: [FirebirdService],
})
export class DatabaseModule {}

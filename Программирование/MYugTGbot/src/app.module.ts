import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
// BotModule будет создан позже
// DocumentsModule удален - не нужен

@Module({
  imports: [
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Telegraf
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN || '',
    }),
    
    // Модули
    DatabaseModule,
    UsersModule,
    // BotModule - будет создан позже
    // DocumentsModule - удален
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

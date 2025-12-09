import { NestFactory } from '@nestjs/core';
import { BotModule } from './bot/bot.module';

async function bootstrap() {
  // Для Telegram бота не нужен HTTP сервер
  const app = await NestFactory.createApplicationContext(BotModule);
  console.log('✅ Telegram бот запущен и готов к работе');
}

bootstrap();
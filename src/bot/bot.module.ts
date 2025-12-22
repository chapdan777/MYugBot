import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { SearchModule } from '../search/search.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { AuthMiddleware } from '../common/middleware/auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule, UsersModule],
      useFactory: async (configService: ConfigService, authMiddleware: AuthMiddleware) => {
        const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
        }
        return {
          token,
          middlewares: [
            (ctx, next) => authMiddleware.authenticate(ctx, next),
          ],
          include: [BotModule],
        };
      },
      inject: [ConfigService, AuthMiddleware],
    }),
    UsersModule,
    OrdersModule,
    PaymentsModule,
    ShipmentsModule,
    SearchModule,
    ExpensesModule,
  ],
  providers: [BotUpdate, AuthMiddleware],
})
export class BotModule {}

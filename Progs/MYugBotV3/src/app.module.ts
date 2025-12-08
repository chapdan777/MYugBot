import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotModule } from './bot/bot.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { SearchModule } from './search/search.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    BotModule,
    UsersModule,
    OrdersModule,
    PaymentsModule,
    ShipmentsModule,
    SearchModule,
    ExpensesModule,
  ],
})
export class AppModule {}

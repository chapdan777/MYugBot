import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';

/**
 * Expenses module - reuses payments functionality for expense tracking
 * Note: Expenses are tracked in the same JOURNAL_CASHFLOW table as payments
 */
@Module({
  imports: [PaymentsModule],
  exports: [PaymentsModule],
})
export class ExpensesModule {}

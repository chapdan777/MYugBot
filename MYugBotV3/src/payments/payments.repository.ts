import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaymentsQueries } from '../database/queries';
import { CashFlowEntry, PaymentDetails, AdvanceBalance } from './payments.service';

/**
 * Payments repository - data access layer for payments
 */
@Injectable()
export class PaymentsRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Получить баланс кассы
   */
  async getCashboxBalance(): Promise<{ amount: number } | null> {
    const query = PaymentsQueries.getCashboxBalance();
    const result = await this.dbService.query(query);
    // В Firebird поля возвращаются в верхнем регистре
    return result.length > 0 ? { amount: result[0].AMOUNT } : null;
  }

  /**
   * Получить операции кассы за дату
   */
  async getCashFlowByDate(date: string): Promise<CashFlowEntry[]> {
    const queryObj = PaymentsQueries.getCashFlowByDate(date);
    const result = await this.dbService.query(queryObj.query, queryObj.params);
    // Преобразуем поля из верхнего регистра в нижний
    return result.map(item => ({
      id: item.ID,
      fact_date: item.FACT_DATE,
      category: item.CATEGORY,
      purpose: item.PURPOSE,
      moneysum: item.MONEYSUM,
      comment: item.COMMENT,
      ts: item.TS,
      deleted: item.DELETED,
    }));
  }

  /**
   * Получить операции кассы за последние дни
   */
  async getCashFlowLastSevenDays(startDate: string, endDate: string): Promise<CashFlowEntry[]> {
    const queryObj = PaymentsQueries.getCashFlowLastSevenDays(startDate, endDate);
    const result = await this.dbService.query(queryObj.query, queryObj.params);
    // Преобразуем поля из верхнего регистра в нижний
    return result.map(item => ({
      id: item.ID,
      fact_date: item.FACT_DATE,
      category: item.CATEGORY,
      purpose: item.PURPOSE,
      moneysum: item.MONEYSUM,
      comment: item.COMMENT,
      ts: item.TS,
      deleted: item.DELETED,
    }));
  }

  /**
   * Создать запись о движении средств
   */
  async createCashFlowEntry(
    factDate: string,
    category: string,
    purpose: string,
    moneySum: number,
    comment: string,
  ): Promise<void> {
    const query = PaymentsQueries.createCashFlowEntry(factDate, category, purpose, moneySum, comment);
    await this.dbService.query(query);
  }

  /**
   * Обновить запись о движении средств
   */
  async updateCashFlowEntry(
    id: number,
    factDate?: string,
    category?: string,
    purpose?: string,
    moneySum?: number,
    comment?: string,
  ): Promise<void> {
    const query = PaymentsQueries.updateCashFlowEntry(id, factDate, category, purpose, moneySum, comment);
    await this.dbService.query(query);
  }

  /**
   * Удалить запись о движении средств
   */
  async deleteCashFlowEntry(id: number): Promise<void> {
    const query = PaymentsQueries.deleteCashFlowEntry(id);
    await this.dbService.query(query);
  }

  /**
   * Получить категории движения средств
   */
  async getCashFlowCategories(): Promise<{ category: string }[]> {
    const query = PaymentsQueries.getCashFlowCategories();
    const result = await this.dbService.query(query);
    // Преобразуем поля из верхнего регистра в нижний
    return result.map(item => ({
      category: item.CATEGORY,
    }));
  }

  /**
   * Получить детали платежей по заказу
   */
  async getOrderPayments(orderId: number): Promise<PaymentDetails | null> {
    const query = PaymentsQueries.getOrderPayments(orderId);
    const result = await this.dbService.query(query);
    // Преобразуем поля из верхнего регистра в нижний
    if (result.length > 0) {
      return {
        order_total_cost: result[0].ORDER_TOTAL_COST,
        order_pay: result[0].ORDER_PAY,
        order_debt: result[0].ORDER_DEBT,
      };
    }
    return null;
  }

  /**
   * Получить баланс аванса
   */
  async getAdvanceBalance(billingAccountId?: number): Promise<AdvanceBalance[]> {
    const query = PaymentsQueries.getAdvanceBalance(billingAccountId);
    const result = await this.dbService.query(query);
    // Преобразуем поля из верхнего регистра в нижний
    return result.map(item => ({
      id_billing_account: item.ID_BILLING_ACCOUNT,
      balance: item.BALANCE,
    }));
  }
}

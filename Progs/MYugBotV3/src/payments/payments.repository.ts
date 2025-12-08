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
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Получить операции кассы за дату
   */
  async getCashFlowByDate(date: string): Promise<CashFlowEntry[]> {
    const query = PaymentsQueries.getCashFlowByDate(date);
    return await this.dbService.query(query);
  }

  /**
   * Получить операции кассы за последние дни
   */
  async getCashFlowLastSevenDays(startDate: string, endDate: string): Promise<CashFlowEntry[]> {
    const query = PaymentsQueries.getCashFlowLastSevenDays(startDate, endDate);
    return await this.dbService.query(query);
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
    return await this.dbService.query(query);
  }

  /**
   * Получить детали платежей по заказу
   */
  async getOrderPayments(orderId: number): Promise<PaymentDetails | null> {
    const query = PaymentsQueries.getOrderPayments(orderId);
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Получить баланс аванса
   */
  async getAdvanceBalance(billingAccountId?: number): Promise<AdvanceBalance[]> {
    const query = PaymentsQueries.getAdvanceBalance(billingAccountId);
    return await this.dbService.query(query);
  }
}

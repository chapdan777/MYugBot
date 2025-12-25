import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';

/**
 * Cash flow entry interface
 */
export interface CashFlowEntry {
  id: number;
  fact_date: Date;
  category: string;
  purpose: string;
  moneysum: number;
  comment: string;
  ts: Date;
  deleted: number;
}

/**
 * Payment details interface
 */
export interface PaymentDetails {
  order_total_cost: number;
  order_pay: number;
  order_debt: number;
}

/**
 * Advance balance interface
 */
export interface AdvanceBalance {
  id_billing_account: number;
  balance: number;
}

/**
 * Payments service - business logic for payment operations
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  /**
   * Получить баланс кассы
   */
  async getCashboxBalance(): Promise<number> {
    const result = await this.paymentsRepository.getCashboxBalance();
    return result?.amount || 0;
  }

  /**
   * Получить операции кассы за дату
   */
  async getCashFlowByDate(date: string): Promise<CashFlowEntry[]> {
    return await this.paymentsRepository.getCashFlowByDate(date);
  }

  /**
   * Получить операции кассы за последние 7 дней
   */
  async getCashFlowLastSevenDays(): Promise<CashFlowEntry[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Преобразуем даты в строковый формат YYYY-MM-DD для корректной работы с Firebird
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    return await this.paymentsRepository.getCashFlowLastSevenDays(
      formatDate(startDate),
      formatDate(endDate),
    );
  }

  /**
   * Создать запись о движении средств
   */
  async createCashFlowEntry(entry: {
    factDate: string;
    category: string;
    purpose: string;
    moneySum: number;
    comment: string;
  }): Promise<void> {
    return await this.paymentsRepository.createCashFlowEntry(
      entry.factDate,
      entry.category,
      entry.purpose,
      entry.moneySum,
      entry.comment,
    );
  }

  /**
   * Обновить запись о движении средств
   */
  async updateCashFlowEntry(
    id: number,
    updates: {
      factDate?: string;
      category?: string;
      purpose?: string;
      moneySum?: number;
      comment?: string;
    },
  ): Promise<void> {
    return await this.paymentsRepository.updateCashFlowEntry(
      id,
      updates.factDate,
      updates.category,
      updates.purpose,
      updates.moneySum,
      updates.comment,
    );
  }

  /**
   * Удалить запись о движении средств
   */
  async deleteCashFlowEntry(id: number): Promise<void> {
    return await this.paymentsRepository.deleteCashFlowEntry(id);
  }

  /**
   * Получить категории движения средств
   */
  async getCashFlowCategories(): Promise<string[]> {
    const result = await this.paymentsRepository.getCashFlowCategories();
    return result.map((r) => r.category);
  }

  /**
   * Получить детали платежей по заказу
   */
  async getOrderPayments(orderId: number): Promise<PaymentDetails | null> {
    return await this.paymentsRepository.getOrderPayments(orderId);
  }

  /**
   * Получить баланс аванса
   */
  async getAdvanceBalance(billingAccountId?: number): Promise<AdvanceBalance[]> {
    return await this.paymentsRepository.getAdvanceBalance(billingAccountId);
  }

  /**
   * Форматировать операции кассы для отображения
   */
  formatCashFlowForDisplay(
    entries: CashFlowEntry[],
    page: number = 1,
    limit: number = 10,
  ): { text: string; totalPages: number } {
    if (entries.length === 0) {
      return { text: 'Нет операций за указанный период.', totalPages: 0 };
    }

    const totalPages = Math.ceil(entries.length / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntries = entries.slice(startIndex, endIndex);

    let text = `Кассовые операции (c ${startIndex + 1} по ${Math.min(endIndex, entries.length)} из ${entries.length}):\n\n`;

    let totalIncome = 0;
    let totalExpense = 0;
    
    // Считаем итоги по всем записям, а не только на странице
    entries.forEach(entry => {
      if (entry.moneysum > 0) {
        totalIncome += entry.moneysum;
      } else {
        totalExpense += entry.moneysum;
      }
    });

    paginatedEntries.forEach((entry) => {
      const isIncome = entry.moneysum > 0;
      const icon = isIncome ? '🔹' : '🔻';
      
      const entryIndex = entries.indexOf(entry) + 1;

      text += `${entryIndex}. ${icon} ${this.formatDate(entry.fact_date)}\n`;
      text += `💰 <b>${this.formatMoney(entry.moneysum)}</b>\n`;
      text += `▪️ ${entry.category}; <u>${entry.purpose}</u>\n`;
      if (entry.comment) {
        text += `<i>${entry.comment}</i>\n`;
      }
      text += `${'—'.repeat(16)}\n`;
    });

    text += `\n<u>Итого за период:</u>\n`;
    text += `🔹 Приход: <b>${this.formatMoney(totalIncome)}</b>\n`;
    text += `🔻 Расход: <b>${this.formatMoney(totalExpense)}</b>\n`;

    return { text, totalPages };
  }

  /**
   * Форматирование денежной суммы
   */
  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }

  /**
   * Форматирование даты
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ru-RU');
  }
}

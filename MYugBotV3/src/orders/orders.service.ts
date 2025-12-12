import { Injectable } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';

/**
 * Order interface based on ITM database structure
 */
export interface Order {
  id: number;
  itm_ordernum: string;
  ordernum: string;
  order_type: string;
  manager: string;
  clientname: string;
  city: string;
  price_column: string;
  fasad_mat: string;
  fasad_model: string;
  color: string;
  order_total_cost: number;
  order_cost: number;
  order_pay: number;
  order_debt: number;
  order_generalsq: number;
  fact_date_firstsave: Date;
  plan_date_firststage: Date;
  plan_date_pack: Date;
  fact_date_order_out: Date;
  status_description: string;
  status_num: number;
  is_prepaid: number;
  color_type: string;
  color_patina: string;
  primech: string;
}

/**
 * Order element (nomenclature) interface
 */
export interface OrderElement {
  id: number;
  order_id: number;
  name: string;
  height: number;
  width: number;
  el_count: number;
  square: number;
  comment?: string;
}

/**
 * Order plan interface
 */
export interface OrderPlan {
  id: number;
  order_id: number;
  date_sector: string;
  date3: Date;
}

/**
 * Orders service - business logic for order operations
 */
@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  /**
   * Получить заказ по ID
   */
  async getOrderById(orderId: number): Promise<Order | null> {
    return await this.ordersRepository.getOrderById(orderId);
  }

  /**
   * Получить элементы заказа (номенклатуры)
   */
  async getOrderElements(orderId: number): Promise<OrderElement[]> {
    return await this.ordersRepository.getOrderElements(orderId);
  }

  /**
   * Получить планы по заказу
   */
  async getOrderPlans(orderId: number): Promise<OrderPlan[]> {
    return await this.ordersRepository.getOrderPlans(orderId);
  }

  /**
   * Получить план выполнения заказа
   */
  async getOrderExecutionPlan(orderId: number) {
    return await this.ordersRepository.getOrderExecutionPlan(orderId);
  }

  /**
   * Получить последние действия с заказом
   */
  async getRecentOrderActions(orderId: number) {
    return await this.ordersRepository.getRecentOrderActions(orderId);
  }

  /**
   * Получить заказы менеджера по имени
   */
  async getOrdersByManager(managerName: string): Promise<Order[]> {
    return await this.ordersRepository.getOrdersByManager(managerName);
  }

  /**
   * Получить упакованные заказы
   */
  async getPackagedOrders(): Promise<Order[]> {
    return await this.ordersRepository.getPackagedOrders();
  }

  /**
   * Получить упакованные заказы с долгом
   */
  async getPackagedOrdersWithDebt(): Promise<Order[]> {
    return await this.ordersRepository.getPackagedOrdersWithDebt();
  }

  /**
   * Получить все заказы с долгом
   */
  async getOrdersWithDebt(): Promise<Order[]> {
    return await this.ordersRepository.getOrdersWithDebt();
  }

  /**
   * Поиск заказов по дате
   */
  async searchOrdersByDate(date: string): Promise<Order[]> {
    return await this.ordersRepository.searchOrdersByDate(date);
  }

  /**
   * Поиск заказов по ID или номеру
   */
  async searchOrdersByIdOrNumber(searchText: string): Promise<Order[]> {
    return await this.ordersRepository.searchOrdersByIdOrNumber(searchText);
  }

  /**
   * Поиск заказов по ключевым словам
   */
  async searchOrdersByKeywords(keywords: string[]): Promise<Order[]> {
    return await this.ordersRepository.searchOrdersByKeywords(keywords);
  }

  /**
   * Получить полную информацию о заказе для отображения
   */
  async getOrderFullInfo(orderId: number) {
    const [order, elements, plans, executionPlan, recentActions] = await Promise.all([
      this.getOrderById(orderId),
      this.getOrderElements(orderId),
      this.getOrderPlans(orderId),
      this.getOrderExecutionPlan(orderId),
      this.getRecentOrderActions(orderId),
    ]);

    return {
      order,
      elements,
      plans,
      executionPlan,
      recentActions,
    };
  }

  /**
   * Форматировать заказ для отображения в Telegram
   */
  formatOrderForDisplay(order: Order, elements: OrderElement[], showPrices: boolean = true): string {
    // Первая строка: ID, клиент, номер и примечания
    let firstLine = `🆔 ${order.id} ${order.clientname || ''}`;
    
    if (order.ordernum) {
      firstLine += ` №${order.ordernum}`;
    }
    
    if (order.primech && order.primech.trim()) {
      firstLine += ` ${order.primech.trim()}`;
    }
    
    let text = `${firstLine}\n`;
    text += `⚛️ ${order.status_description || 'Статус неизвестен'}\n`;
    text += `🚻 <b>${order.clientname || 'Клиент не указан'}</b>\n`;
    text += `${'—'.repeat(22)}\n`;

    if (order.manager) text += `🔹 Менеджер: <i>${order.manager}</i>\n`;
    if (order.order_type) text += `🔹 Тип заказа: <i>${order.order_type}</i>\n`;
    if (order.fasad_mat) text += `🔹 Материал: <i>${order.fasad_mat}</i>\n`;
    if (order.fasad_model) text += `🔹 Текстура: <i>${order.fasad_model}</i>\n`;
    if (order.color) text += `🔹 Цвет: <i>${order.color}</i>\n`;
    if (order.color_patina) text += `🔹 Патина: <i>${order.color_patina}</i>\n`;
    if (order.color_type) text += `🔹 Лак: <i>${order.color_type}</i>\n`;
    
    // Показываем цены только для Плательщиков, Администраторов, Менеджеров
    if (showPrices && order.order_total_cost !== undefined) {
      text += `\n💰 Стоимость: ${this.formatMoney(order.order_total_cost)}\n`;
      if (order.order_pay !== undefined) {
        text += `💵 Оплачено: ${this.formatMoney(order.order_pay)}\n`;
      }
      if (order.order_debt !== undefined && order.order_debt < 0) {
        text += `⚠️ Долг: ${this.formatMoney(Math.abs(order.order_debt))}\n`;
      }
    }

    return text;
  }

  /**
   * Форматировать элементы заказа для отображения
   */
  formatOrderElementsForDisplay(elements: OrderElement[]): string {
    if (elements.length === 0) {
      return 'Нет элементов заказа.';
    }

    let text = `\n${'—'.repeat(22)}\n`;
    
    elements.forEach((el, index) => {
      text += `${index + 1}. <b>${el.name}</b>`;
      if (el.height && el.width) {
        text += ` ${el.height} x ${el.width}`;
      }
      text += ` - ${el.el_count}\n`;
    });

    text += `${'—'.repeat(22)}\n`;

    return text;
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
}

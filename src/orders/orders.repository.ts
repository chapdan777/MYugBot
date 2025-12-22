import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OrdersQueries } from '../database/queries';
import { Order, OrderElement, OrderPlan } from './orders.service';

/**
 * Orders repository - data access layer for orders
 */
@Injectable()
export class OrdersRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Получить заказ по ID
   */
  async getOrderById(orderId: number): Promise<Order | null> {
    const query = OrdersQueries.getOrderById(orderId);
    const result = await this.dbService.query(query);
    
    if (result.length === 0) return null;
    
    // Map database fields (uppercase) to interface fields (lowercase)
    const row = result[0];
    return {
      id: row.ID,
      itm_ordernum: row.ITM_ORDERNUM,
      ordernum: row.ORDERNUM,
      order_type: row.ORDER_TYPE,
      manager: row.MANAGER,
      clientname: row.CLIENTNAME,
      city: row.CITY,
      price_column: row.PRICE_COLUMN,
      fasad_mat: row.FASAD_MAT,
      fasad_model: row.FASAD_MODEL,
      color: row.COLOR,
      order_total_cost: row.ORDER_TOTAL_COST,
      order_cost: row.ORDER_COST,
      order_pay: row.ORDER_PAY,
      order_debt: row.ORDER_DEBT,
      order_generalsq: row.ORDER_GENERALSQ,
      fact_date_firstsave: row.FACT_DATE_FIRSTSAVE,
      plan_date_firststage: row.PLAN_DATE_FIRSTSTAGE,
      plan_date_pack: row.PLAN_DATE_PACK,
      fact_date_order_out: row.FACT_DATE_ORDER_OUT,
      status_description: row.STATUS_DESCRIPTION,
      status_num: row.STATUS_NUM,
      is_prepaid: row.IS_PREPAID,
      color_type: row.COLOR_TYPE,
      color_patina: row.COLOR_PATINA,
      primech: row.PRIMECH,
    };
  }

  /**
   * Получить элементы заказа
   */
  async getOrderElements(orderId: number): Promise<OrderElement[]> {
    try {
      console.log(`Репозиторий заказов: формирование запроса для заказа №${orderId}`);
      const query = OrdersQueries.getOrderElements(orderId);
      console.log(`Репозиторий заказов: выполнение запроса для заказа №${orderId}: ${query}`);
      
      const results = await this.dbService.query(query);
      console.log(`Репозиторий заказов: получено ${results.length} записей для заказа №${orderId}`);
      
      // Map database fields (uppercase) to interface fields (lowercase)
      const mappedResults = results.map(row => {
        return {
          id: row.ID,
          order_id: row.ORDER_ID,
          name: row.NAME,
          height: row.HEIGHT,
          width: row.WIDTH,
          el_count: row.EL_COUNT,
          square: row.SQUARE,
          comment: row.COMMENT,
        };
      });
      
      console.log(`Репозиторий заказов: маппинг завершен, возвращаем ${mappedResults.length} элементов`);
      return mappedResults;
    } catch (error) {
      console.error(`Репозиторий заказов: ошибка получения элементов для заказа №${orderId}:`, error);
      console.error('Детали ошибки:', {
        orderId: orderId,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Получить планы заказа
   */
  async getOrderPlans(orderId: number): Promise<OrderPlan[]> {
    const query = OrdersQueries.getOrderPlans(orderId);
    return await this.dbService.query(query);
  }

  /**
   * Получить план выполнения заказа
   */
  async getOrderExecutionPlan(orderId: number) {
    const query = OrdersQueries.getOrderExecutionPlan(orderId);
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Получить последние действия с заказом
   */
  async getRecentOrderActions(orderId: number) {
    const query = OrdersQueries.getRecentOrderActions(orderId);
    return await this.dbService.query(query);
  }

  /**
   * Получить заказы менеджера
   */
  async getOrdersByManager(managerName: string): Promise<Order[]> {
    const query = OrdersQueries.getOrdersByManager(managerName);
    return await this.dbService.query(query);
  }

  /**
   * Получить упакованные заказы
   */
  async getPackagedOrders(): Promise<Order[]> {
    const query = OrdersQueries.getPackagedOrders();
    return await this.dbService.query(query);
  }

  /**
   * Получить упакованные заказы с долгом
   */
  async getPackagedOrdersWithDebt(): Promise<Order[]> {
    const query = OrdersQueries.getPackagedOrdersWithDebt();
    return await this.dbService.query(query);
  }

  /**
   * Получить заказы с долгом
   */
  async getOrdersWithDebt(): Promise<Order[]> {
    const query = OrdersQueries.getOrdersWithDebt();
    return await this.dbService.query(query);
  }

  /**
   * Поиск заказов по дате
   */
  async searchOrdersByDate(date: string): Promise<Order[]> {
    const query = OrdersQueries.searchOrdersByDate(date);
    return await this.dbService.query(query);
  }

  /**
   * Поиск заказов по ID или номеру
   */
  async searchOrdersByIdOrNumber(searchText: string): Promise<Order[]> {
    const query = OrdersQueries.searchOrdersByIdOrNumber(searchText);
    const results = await this.dbService.query(query);
    return this.mapOrdersArray(results);
  }

  /**
   * Поиск заказов по ключевым словам
   */
  async searchOrdersByKeywords(keywords: string[]): Promise<Order[]> {
    const query = OrdersQueries.searchOrdersByKeywords(keywords);
    const results = await this.dbService.query(query);
    return this.mapOrdersArray(results);
  }

  /**
   * Маппинг массива заказов из базы данных
   */
  private mapOrdersArray(results: any[]): Order[] {
    return results.map(row => ({
      id: row.ID,
      itm_ordernum: row.ITM_ORDERNUM,
      ordernum: row.ORDERNUM,
      order_type: row.ORDER_TYPE,
      manager: row.MANAGER,
      clientname: row.CLIENTNAME,
      city: row.CITY,
      price_column: row.PRICE_COLUMN,
      fasad_mat: row.FASAD_MAT,
      fasad_model: row.FASAD_MODEL,
      color: row.COLOR,
      order_total_cost: row.ORDER_TOTAL_COST,
      order_cost: row.ORDER_COST,
      order_pay: row.ORDER_PAY,
      order_debt: row.ORDER_DEBT,
      order_generalsq: row.ORDER_GENERALSQ,
      fact_date_firstsave: row.FACT_DATE_FIRSTSAVE,
      plan_date_firststage: row.PLAN_DATE_FIRSTSTAGE,
      plan_date_pack: row.PLAN_DATE_PACK,
      fact_date_order_out: row.FACT_DATE_ORDER_OUT,
      status_description: row.STATUS_DESCRIPTION,
      status_num: row.STATUS_NUM,
      is_prepaid: row.IS_PREPAID,
      color_type: row.COLOR_TYPE,
      color_patina: row.COLOR_PATINA,
      primech: row.PRIMECH,
    }));
  }
}

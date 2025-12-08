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
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Получить элементы заказа
   */
  async getOrderElements(orderId: number): Promise<OrderElement[]> {
    const query = OrdersQueries.getOrderElements(orderId);
    return await this.dbService.query(query);
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
    return await this.dbService.query(query);
  }

  /**
   * Поиск заказов по ключевым словам
   */
  async searchOrdersByKeywords(keywords: string[]): Promise<Order[]> {
    const query = OrdersQueries.searchOrdersByKeywords(keywords);
    return await this.dbService.query(query);
  }
}

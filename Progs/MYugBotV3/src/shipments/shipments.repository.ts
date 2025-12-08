import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ShipmentsQueries } from '../database/queries';
import { ShipmentSummary, ShipmentDetail } from './shipments.service';

/**
 * Shipments repository - data access layer for shipments
 */
@Injectable()
export class ShipmentsRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Получить список отгрузок
   */
  async getShipmentsList(isProfile: boolean): Promise<ShipmentSummary[]> {
    const query = ShipmentsQueries.getShipmentsList(isProfile);
    return await this.dbService.query(query);
  }

  /**
   * Получить детали отгрузки
   */
  async getShipmentDetails(
    driverName: string,
    shipmentDate: string,
    isProfile: boolean,
  ): Promise<ShipmentDetail[]> {
    const query = ShipmentsQueries.getShipmentDetails(driverName, shipmentDate, isProfile);
    return await this.dbService.query(query);
  }

  /**
   * Получить упакованные заказы для уведомлений
   */
  async getPackedOrdersForNotification(lastPackedId: number) {
    const query = ShipmentsQueries.getPackedOrdersForNotification(lastPackedId);
    return await this.dbService.query(query);
  }

  /**
   * Получить максимальный ID упакованного заказа
   */
  async getMaxPackedOrderId(): Promise<{ id: number } | null> {
    const query = ShipmentsQueries.getMaxPackedOrderId();
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Получить данные Telegram
   */
  async getTelegramData(key: string): Promise<{ value_data: string } | null> {
    const query = ShipmentsQueries.getTelegramData(key);
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Установить данные Telegram
   */
  async setTelegramData(key: string, value: string): Promise<void> {
    const query = ShipmentsQueries.setTelegramData(key, value);
    await this.dbService.query(query);
  }
}

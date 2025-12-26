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
    const results = await this.dbService.query(query);
    
    // Map database fields (uppercase) to interface fields (lowercase)
    return results.map(row => ({
      fact_date_out: row.FACT_DATE_OUT,
      driver_name: row.DRIVER_NAME,
      box: row.BOX,
      amount: row.AMOUNT,
      debt: row.DEBT || 0
    }));
  }

  /**
   * Получить детали отгрузки
   */
  async getShipmentDetails(
    driverName: string,
    shipmentDate: string | Date,
    isProfile: boolean,
  ): Promise<ShipmentDetail[]> {
    const query = ShipmentsQueries.getShipmentDetails(isProfile);
    // Convert Date to 'YYYY-MM-DD' format for Firebird DATE comparison
    let dateParam: string;
    if (shipmentDate instanceof Date) {
      // Use local date (not UTC) to match how dates are displayed
      const year = shipmentDate.getFullYear();
      const month = String(shipmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(shipmentDate.getDate()).padStart(2, '0');
      dateParam = `${year}-${month}-${day}`;
    } else {
      dateParam = shipmentDate;
    }
    const params = [driverName, dateParam];
    const results = await this.dbService.query(query, params);
    
    // Map database fields (uppercase) to interface fields (lowercase)
    return results.map(row => ({
      id: row.ID,
      clientname: row.CLIENTNAME,
      box_count: row.BOX_COUNT,
      amount: row.AMOUNT,
      debt: row.DEBT || 0
    }));
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
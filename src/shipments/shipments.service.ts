import { Injectable } from '@nestjs/common';
import { ShipmentsRepository } from './shipments.repository';

/**
 * Shipment summary interface
 */
export interface ShipmentSummary {
  fact_date_out: Date;
  driver_name: string;
  box: number;
  amount: number;
}

// Simple in-memory cache for storing shipment data by user ID
interface UserShipmentCache {
  [userId: number]: {
    shipments: ShipmentSummary[];
    timestamp: number;
  };
}

/**
 * Shipment details interface
 */
export interface ShipmentDetail {
  id: number;
  clientname: string;
  box_count: number;
  amount: number;
}

/**
 * Shipments service - business logic for shipment operations
 */
@Injectable()
export class ShipmentsService {
  // In-memory cache for user shipment data (expires after 1 hour)
  private userShipmentCache: UserShipmentCache = {};
///************************ */
  
  // Map to store last shown shipments-list message per user (in-memory).
// Format: userId -> { chatId: number, messageId: number, isProfile?: boolean }
private lastListMessageByUser: Map<number, { chatId: number; messageId: number; isProfile?: boolean }> = new Map();

/**
 * Save the last shipments list message reference for a user.
 */
setLastListMessage(userId: number, info: { chatId: number; messageId: number; isProfile?: boolean }) {
  this.lastListMessageByUser.set(userId, info);
}

/**
 * Get the saved last shipments list message reference for a user.
 */
getLastListMessage(userId: number) {
  return this.lastListMessageByUser.get(userId);
}

/**
 * Clear saved last shipments list message reference for a user.
 */
clearLastListMessage(userId: number) {
  this.lastListMessageByUser.delete(userId);
}

///************************ */
  
  constructor(private readonly shipmentsRepository: ShipmentsRepository) {
    // Clean up expired cache entries periodically
    setInterval(() => this.cleanupExpiredCache(), 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Clean up expired cache entries (older than 1 hour)
   */
  private cleanupExpiredCache() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const userId in this.userShipmentCache) {
      if (this.userShipmentCache[userId].timestamp < oneHourAgo) {
        delete this.userShipmentCache[userId];
      }
    }
  }
  
  /**
   * Store shipment data for a user
   */
  setUserShipments(userId: number, shipments: ShipmentSummary[]) {
    this.userShipmentCache[userId] = {
      shipments,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get shipment data for a user
   */
  getUserShipments(userId: number): ShipmentSummary[] | null {
    const cached = this.userShipmentCache[userId];
    if (!cached) return null;
    
    // Check if cache is expired (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (cached.timestamp < oneHourAgo) {
      delete this.userShipmentCache[userId];
      return null;
    }
    
    return cached.shipments;
  }

  /**
   * Получить список отгрузок (профиль или фасады)
   */
  async getShipmentsList(isProfile: boolean): Promise<ShipmentSummary[]> {
    return await this.shipmentsRepository.getShipmentsList(isProfile);
  }

  /**
   * Получить детали отгрузки по дате и водителю
   */
  async getShipmentDetails(
    driverName: string,
    shipmentDate: string,
    isProfile: boolean,
  ): Promise<ShipmentDetail[]> {
    return await this.shipmentsRepository.getShipmentDetails(driverName, shipmentDate, isProfile);
  }

  /**
   * Получить упакованные заказы для уведомлений
   */
  async getPackedOrdersForNotification(lastPackedId: number) {
    return await this.shipmentsRepository.getPackedOrdersForNotification(lastPackedId);
  }

  /**
   * Получить максимальный ID упакованного заказа
   */
  async getMaxPackedOrderId(): Promise<number> {
    const result = await this.shipmentsRepository.getMaxPackedOrderId();
    return result?.id || 0;
  }

  /**
   * Получить данные Telegram
   */
  async getTelegramData(key: string): Promise<string | null> {
    const result = await this.shipmentsRepository.getTelegramData(key);
    return result?.value_data || null;
  }

  /**
   * Установить данные Telegram
   */
  async setTelegramData(key: string, value: string): Promise<void> {
    return await this.shipmentsRepository.setTelegramData(key, value);
  }

  /**
   * Форматировать список отгрузок для отображения
   */
  formatShipmentsListForDisplay(shipments: ShipmentSummary[], type: string): string {
    if (shipments.length === 0) {
      return `Нет отгрузок ${type}.`;
    }

    let text = `Отгрузки ${type} (${shipments.length}):\n\n`;

    shipments.forEach((shipment, index) => {
      // Handle potentially undefined shipment properties
      const date = shipment.fact_date_out ? this.formatDate(shipment.fact_date_out) : 'Нет даты';
      const driver = shipment.driver_name || 'Неизвестный водитель';
      const boxCount = shipment.box !== undefined ? shipment.box : 0;
      const amount = shipment.amount !== undefined ? shipment.amount : 0;
      
      text += `${index + 1}. ${date}\n`;
      text += `🚚 Водитель: <b>${driver}</b>\n`;
      text += `📦 Упаковок: ${boxCount}\n`;
      text += `💰 Сумма: ${this.formatMoney(amount)}\n`;
      text += `${'—'.repeat(16)}\n`;
    });

    return text;
  }

  /**
   * Форматировать детали отгрузки для отображения
   */
  formatShipmentDetailsForDisplay(
    details: ShipmentDetail[],
    driverName: string,
    shipmentDate: Date,
  ): string {
    if (details.length === 0) {
      return 'Нет деталей отгрузки.';
    }

    const totalBoxes = details.reduce((sum, d) => sum + (d.box_count || 0), 0);
    const totalAmount = details.reduce((sum, d) => sum + (d.amount || 0), 0);

    let text = `Отправка от ${this.formatDate(shipmentDate)}\n`;
    text += `🚚 Водитель: <b>${driverName || 'Неизвестный водитель'}</b>\n`;
    text += `📦 Всего упаковок: ${totalBoxes}\n`;
    text += `💰 Сумма: ${this.formatMoney(totalAmount)}\n`;
    text += `${'—'.repeat(22)}\n\n`;

    // Group by client
    const clientGroups = new Map<string, ShipmentDetail[]>();
    details.forEach((detail) => {
      // Handle potentially undefined client names
      const clientName = detail.clientname || 'Неизвестный клиент';
      if (!clientGroups.has(clientName)) {
        clientGroups.set(clientName, []);
      }
      clientGroups.get(clientName)!.push(detail);
    });

    clientGroups.forEach((orders, clientName) => {
      const clientBoxes = orders.reduce((sum, o) => sum + (o.box_count || 0), 0);
      const clientAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

      text += `👨🏼‍💼 <b>${clientName}</b>\n`;
      text += `(${clientBoxes} уп. / ${this.formatMoney(clientAmount)})\n`;
      text += `${'—'.repeat(16)}\n`;

      orders.forEach((order, index) => {
        // Handle potentially undefined order properties
        const orderId = order.id || 'Неизвестный';
        const boxCount = order.box_count || 0;
        const amount = order.amount || 0;
        
        text += `${index + 1}. Заказ № ${orderId}\n`;
        text += `   ${boxCount} уп / ${this.formatMoney(amount)}\n`;
        text += `   📂 /id${orderId}\n`;
      });

      text += `\n`;
    });

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

  /**
   * Форматирование даты для базы данных (соответствует formatDateToDb из Node-RED)
   */
  private formatDateToDb(date: Date | string): string {
    if (!date) return "";
    
    let d: Date;
    if (typeof date === 'string') {
      // Handle different date string formats
      if (date.includes('T')) {
        // ISO format
        d = new Date(date);
      } else {
        // Assume YYYY-MM-DD format
        const parts = date.split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date(date);
        }
      }
    } else {
      d = date;
    }
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return "";
    }
    
    // Return date in YYYY-MM-DD format (matches database expectation)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Форматирование даты для отображения
   */
  private formatDate(date: Date | string): string {
    // Handle undefined or null dates
    if (!date) {
      return 'Нет даты';
    }
    
    let d: Date;
    
    if (typeof date === 'string') {
      // Handle different date string formats
      if (date.includes('T')) {
        // ISO format
        d = new Date(date);
      } else {
        // Assume YYYY-MM-DD format
        const parts = date.split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date(date);
        }
      }
    } else {
      d = date;
    }
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Некорректная дата';
    }
    
    return d.toLocaleDateString('ru-RU');
  }
}

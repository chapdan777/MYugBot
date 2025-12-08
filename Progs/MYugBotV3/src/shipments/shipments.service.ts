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
  constructor(private readonly shipmentsRepository: ShipmentsRepository) {}

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
      text += `${index + 1}. ${this.formatDate(shipment.fact_date_out)}\n`;
      text += `🚚 Водитель: <b>${shipment.driver_name}</b>\n`;
      text += `📦 Упаковок: ${shipment.box}\n`;
      text += `💰 Сумма: ${this.formatMoney(shipment.amount)}\n`;
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

    const totalBoxes = details.reduce((sum, d) => sum + d.box_count, 0);
    const totalAmount = details.reduce((sum, d) => sum + d.amount, 0);

    let text = `Отправка от ${this.formatDate(shipmentDate)}\n`;
    text += `🚚 Водитель: <b>${driverName}</b>\n`;
    text += `📦 Всего упаковок: ${totalBoxes}\n`;
    text += `💰 Сумма: ${this.formatMoney(totalAmount)}\n`;
    text += `${'—'.repeat(22)}\n\n`;

    // Group by client
    const clientGroups = new Map<string, ShipmentDetail[]>();
    details.forEach((detail) => {
      if (!clientGroups.has(detail.clientname)) {
        clientGroups.set(detail.clientname, []);
      }
      clientGroups.get(detail.clientname)!.push(detail);
    });

    clientGroups.forEach((orders, clientName) => {
      const clientBoxes = orders.reduce((sum, o) => sum + o.box_count, 0);
      const clientAmount = orders.reduce((sum, o) => sum + o.amount, 0);

      text += `👨🏼‍💼 <b>${clientName}</b>\n`;
      text += `(${clientBoxes} уп. / ${this.formatMoney(clientAmount)})\n`;
      text += `${'—'.repeat(16)}\n`;

      orders.forEach((order, index) => {
        text += `${index + 1}. Заказ № ${order.id}\n`;
        text += `   ${order.box_count} уп / ${this.formatMoney(order.amount)}\n`;
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
   * Форматирование даты
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ru-RU');
  }
}

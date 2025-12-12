import { Context } from 'telegraf';
import { ShipmentSummary } from '../shipments/shipments.service';

/**
 * Extended Telegraf Context with custom properties
 */
export interface ExtendedContext extends Context {
  currentShipments?: ShipmentSummary[];
}
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required roles for a handler
 * @param roles - Array of role IDs that can access this handler
 * 
 * Role IDs:
 * 1 - Guest (Гость)
 * 2 - Client (Клиент)
 * 3 - Agent (Агент)
 * 4 - Counterparty (Контрагент)
 * 5 - Payer (Плательщик)
 * 6 - Manager (Менеджер)
 * 7 - Administrator (Администратор)
 */
export const Roles = (...roles: number[]) => SetMetadata('roles', roles);

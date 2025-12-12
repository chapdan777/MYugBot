import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, CreateUserDto } from './users.service';
import { UsersQueries } from '../database/queries';

/**
 * Репозиторий для работы с пользователями в ITM DB
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Найти пользователя по Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const query = UsersQueries.findByTelegramId(telegramId);
    const result = await this.dbService.query(query);
    if (result.length > 0) {
      const user = result[0];
      // Обрезаем пробелы из role_name (из-за CHAR в Firebird)
      if (user.ROLE_NAME) {
        user.role_name = user.ROLE_NAME.trim();
      }
      return user;
    }
    return null;
  }

  /**
   * Создать нового пользователя
   */
  async create(dto: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO tg_users (telegram_id, chat_id, first_name, last_name, username, 
                            group_id, is_registered, is_blocked, created_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, 0, CURRENT_TIMESTAMP)
      RETURNING id, telegram_id, chat_id, group_id, first_name, last_name, username, 
                is_registered, is_blocked
    `;

    const result = await this.dbService.query(query, [
      dto.telegram_id,
      dto.chat_id,
      dto.first_name,
      dto.last_name || null,
      dto.username || null,
    ]);

    return result[0];
  }

  /**
   * Обновить пользователя
   */
  async update(telegramId: number, updates: Partial<User>): Promise<User | null> {
    // Динамическое построение UPDATE запроса на основе переданных полей
    const fields = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'telegram_id' && key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return this.findByTelegramId(telegramId);

    const values = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'telegram_id' && key !== 'id')
      .map(key => updates[key]);

    const query = `
      UPDATE tg_users 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = ?
    `;

    await this.dbService.query(query, [...values, telegramId]);
    return this.findByTelegramId(telegramId);
  }

  /**
   * Получить всех зарегистрированных пользователей
   */
  async getRegisteredUsers(): Promise<User[]> {
    const query = UsersQueries.getRegisteredUsers();
    return await this.dbService.query(query);
  }

  /**
   * Получить пользователей, ожидающих регистрации
   */
  async getAwaitingRegistration(): Promise<User[]> {
    const query = UsersQueries.getAwaitingRegistration();
    return await this.dbService.query(query);
  }

  /**
   * Получить контрагентов (агентов и контрагентов)
   */
  async getContractors(): Promise<User[]> {
    const query = UsersQueries.getContractors();
    return await this.dbService.query(query);
  }

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(userId: number, updates: Partial<CreateUserDto>): Promise<void> {
    const query = UsersQueries.updateUserProfile(
      userId,
      updates.first_name,
      updates.last_name,
      updates.phone_number,
      updates.card,
      updates.card_owner,
    );
    await this.dbService.query(query);
  }

  /**
   * Изменить роль пользователя
   */
  async updateGroup(userId: number, groupId: number): Promise<void> {
    const query = UsersQueries.updateUserGroup(userId, groupId);
    await this.dbService.query(query);
  }

  /**
   * Заблокировать пользователя
   */
  async blockUser(userId: number): Promise<void> {
    const query = UsersQueries.blockUser(userId);
    await this.dbService.query(query);
  }

  /**
   * Разблокировать пользователя
   */
  async unblockUser(userId: number): Promise<void> {
    const query = UsersQueries.unblockUser(userId);
    await this.dbService.query(query);
  }

  /**
   * Зарегистрировать пользователя
   */
  async registerUser(userId: number): Promise<void> {
    const query = UsersQueries.registerUser(userId);
    await this.dbService.query(query);
  }

  /**
   * Получить пользователей по ID группы
   */
  async getUsersByGroupId(groupId: number): Promise<User[]> {
    const query = UsersQueries.getUsersByGroupId(groupId);
    return await this.dbService.query(query);
  }
}

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
      return result[0];
    }
    return null;
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: number): Promise<User | null> {
    const query = UsersQueries.findById(id);
    const result = await this.dbService.query(query);
    if (result.length > 0) {
      return result[0];
    }
    return null;
  }

  /**
   * Создать нового пользователя
   */
  async create(dto: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO tg_users (chat_id, first_name, last_name, username, 
                            group_id, is_registered, is_blocked, created_at)
      VALUES (?, ?, ?, ?, 1, 0, 0, CURRENT_TIMESTAMP)
      RETURNING ID AS "id",
                CHAT_ID AS "telegram_id",
                CHAT_ID AS "chat_id",
                GROUP_ID AS "group_id",
                FIRST_NAME AS "first_name",
                LAST_NAME AS "last_name",
                USERNAME AS "username",
                IS_REGISTERED AS "is_registered",
                IS_BLOCKED AS "is_blocked"
    `;

    const result = await this.dbService.query(query, [
      dto.chat_id,
      dto.first_name,
      dto.last_name || null,
      dto.username || null,
    ]);

    return result[0];
  }

  /**
   * Обновить пользователя по Telegram ID
   */
  async update(telegramId: number, updates: Partial<User>): Promise<User | null> {
    // Динамическое построение UPDATE запроса на основе переданных полей
    const fields = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'telegram_id' && key !== 'id' && key !== 'chat_id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return this.findByTelegramId(telegramId);

    const values = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'telegram_id' && key !== 'id' && key !== 'chat_id')
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
   * Обновить пользователя по ID
   */
 async updateById(id: number, updates: Partial<User>): Promise<User | null> {
    // Динамическое построение UPDATE запроса на основе переданных полей
    const fields = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'id' && key !== 'telegram_id' && key !== 'chat_id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return this.findById(id);

    const values = Object.keys(updates)
      .filter(key => updates[key] !== undefined && key !== 'id' && key !== 'telegram_id' && key !== 'chat_id')
      .map(key => updates[key]);

    const query = `
      UPDATE tg_users
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.dbService.query(query, [...values, id]);
    return this.findById(id);
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
      updates.first_name ?? '',
      updates.last_name ?? '',
      updates.phone_number ?? '',
      updates.card ?? '',
      updates.card_owner ?? '',
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

  /**
   * Получить всех пользователей
   */
  async getAllUsers(): Promise<User[]> {
    const query = UsersQueries.getAllUsers();
    const result = await this.dbService.query(query);
    return result.map(user => {
      // Удаляем ROLE_NAME из результата, если оно есть, так как role_name будет вычислено в UsersService
      const { ROLE_NAME, ...userWithoutRoleName } = user;
      return userWithoutRoleName;
    });
 }

  /**
   * Получить пользователей с пагинацией
   */
 async getAllUsersWithPagination(limit: number, offset: number): Promise<User[]> {
    const query = UsersQueries.getAllUsers(limit, offset);
    const result = await this.dbService.query(query);
    return result.map(user => {
      // Удаляем ROLE_NAME из результата, если оно есть, так как role_name будет вычислено в UsersService
      const { ROLE_NAME, ...userWithoutRoleName } = user;
      return userWithoutRoleName;
    });
  }

  /**
   * Получить общее количество пользователей
   */
  async getUsersCount(): Promise<number> {
    const query = UsersQueries.getUsersCount();
    const result = await this.dbService.query(query);
    return result[0]?.total || 0;
  }

}

import { Injectable } from '@nestjs/common';
import { FirebirdService } from '../../database/firebird.service';

/**
 * Репозиторий для работы с пользователями в БД
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly db: FirebirdService) {}

  /**
   * Загрузка всех пользователей из БД
   * TODO: перенести таблицу tg_users в ITM
   */
  async loadUsers() {
    const query = 'SELECT * FROM tg_users';
    return this.db.executeQuery(query);
  }

  /**
   * Получение пользователя по chat_id
   */
  async getUserByChatId(chatId: number) {
    const query = 'SELECT * FROM tg_users u WHERE u.CHAT_ID = ?';
    const result = await this.db.executeQuery(query, [chatId]);
    return result[0] || null;
  }

  /**
   * Создание нового пользователя
   */
  async createUser(userData: any) {
    const query = `
      SELECT ID, CHAT_ID, GROUP_ID, FIRST_NAME, LAST_NAME, USER_NAME, 
             IS_REGISTERED, IS_BLOCKED, BILLING_ID, PARENT_ID
      FROM TGP_CREATE_USER(?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      userData.firstName,
      userData.chatId || null,
      userData.groupId || null,
      userData.lastName || null,
      userData.username || null,
      userData.parentId || null,
    ];

    return this.db.executeQuery(query, params);
  }
}

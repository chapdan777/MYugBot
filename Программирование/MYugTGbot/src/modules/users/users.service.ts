import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

/**
 * Сервис для работы с пользователями
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Получение или создание пользователя по данным Telegram
   */
  async findOrCreate(telegramUser: any) {
    let user = await this.usersRepository.getUserByChatId(telegramUser.id);

    if (!user) {
      const newUserData = {
        chatId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        groupId: 1, // По умолчанию базовая группа
      };

      const result = await this.usersRepository.createUser(newUserData);
      user = result[0];
    }

    return user;
  }

  /**
   * Проверка прав доступа
   */
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    // TODO: Реализовать проверку прав
    return true;
  }
}

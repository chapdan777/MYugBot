import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface User {
  id: number;
 telegram_id: number;
  chat_id: number;
  group_id: number;
  role_name?: string; // Make role_name optional as it will be computed
  first_name: string;
  last_name?: string;
  username?: string;
  is_registered: boolean;
  is_blocked: boolean;
}

export interface CreateUserDto {
  telegram_id: number;
  chat_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  card?: string;
  card_owner?: string;
}

/**
 * Сервис управления пользователями
 * Обрабатывает аутентификацию по Telegram ID и управление профилями
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Найти или создать пользователя по Telegram ID
   * Используется для автоматической регистрации/аутентификации
   */
  async findOrCreateUser(dto: CreateUserDto): Promise<User | null> {
    try {
      let user = await this.usersRepository.findByTelegramId(dto.telegram_id);
      
      if (!user) {
        user = await this.usersRepository.create(dto);
      } else {
        // Обновляем информацию о пользователе, если что-то изменилось
        await this.usersRepository.update(dto.telegram_id, {
          chat_id: dto.chat_id,
          first_name: dto.first_name,
          last_name: dto.last_name,
          username: dto.username,
        });
        user = await this.usersRepository.findByTelegramId(dto.telegram_id);
      }
      
      // Устанавливаем role_name на основе group_id
      if (user) {
        user.role_name = this.translateGroupToRole(user.group_id);
      }
      
      return user;
    } catch (error) {
      console.error('[UsersService] Error in findOrCreateUser:', error);
      throw error;
    }
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findById(id);
    if (user) {
      user.role_name = this.translateGroupToRole(user.group_id);
    }
    return user;
  }

  /**
   * Перевод роли на русский
   */
  private translateRole(role: string): string {
    const roleMap: Record<string, string> = {
      'Guest': 'Гость',
      'Client': 'Клиент',
      'Agent': 'Агент',
      'Contractor': 'Контрагент',
      'Payer': 'Плательщик',
      'Manager': 'Менеджер',
      'Administrator': 'Администратор',
    };
    return roleMap[role] || role;
  }

  /**
   * Преобразовать group_id в название роли
   */
 private translateGroupToRole(groupId: number): string {
    const groupRoleMap: Record<number, string> = {
      1: 'Гость',
      2: 'Клиент',
      3: 'Агент',
      4: 'Контрагент',
      5: 'Плательщик',
      6: 'Менеджер',
      7: 'Администратор',
    };
    return groupRoleMap[groupId] || `Роль ${groupId}`;
  }

  /**
   * Установить role_name для пользователя
   */
  private setUserRoleName(user: User): User {
    if (user) {
      user.role_name = this.translateGroupToRole(user.group_id);
    }
    return user;
  }

  /**
   * Получить всех зарегистрированных пользователей
   */
  async getRegisteredUsers(): Promise<User[]> {
    const users = await this.usersRepository.getRegisteredUsers();
    return users.map(user => this.setUserRoleName(user));
  }

  /**
   * Получить пользователей, ожидающих регистрации
   */
  async getAwaitingRegistration(): Promise<User[]> {
    const users = await this.usersRepository.getAwaitingRegistration();
    return users.map(user => this.setUserRoleName(user));
  }

  /**
   * Получить контрагентов
   */
  async getContractors(): Promise<User[]> {
    const users = await this.usersRepository.getContractors();
    return users.map(user => this.setUserRoleName(user));
  }

 /**
   * Обновить профиль пользователя
   */
 async updateProfile(userId: number, updates: Partial<CreateUserDto>): Promise<void> {
    return await this.usersRepository.updateProfile(userId, updates);
  }

  /**
   * Изменить роль пользователя
   */
  async updateGroup(userId: number, groupId: number): Promise<void> {
    const result = await this.usersRepository.updateGroup(userId, groupId);
    // Не возвращаем пользователя, так как метод void
    return result;
  }

  /**
   * Заблокировать пользователя
   */
  async blockUser(userId: number): Promise<void> {
    return await this.usersRepository.blockUser(userId);
  }

  /**
   * Разблокировать пользователя
   */
  async unblockUser(userId: number): Promise<void> {
    return await this.usersRepository.unblockUser(userId);
  }

 /**
   * Зарегистрировать пользователя
   */
  async registerUser(userId: number): Promise<void> {
    return await this.usersRepository.registerUser(userId);
  }

  /**
   * Получить пользователей по ID группы (роли)
   */
  async getUsersByGroupId(groupId: number): Promise<User[]> {
    const users = await this.usersRepository.getUsersByGroupId(groupId);
    return users.map(user => this.setUserRoleName(user));
  }

  /**
   * Получить всех пользователей
   */
  async getAllUsers(): Promise<User[]> {
    const users = await this.usersRepository.getAllUsers();
    return users.map(user => this.setUserRoleName(user));
  }

  /**
   * Получить все роли
   * Этот метод временно возвращает статический список ролей, так как таблица tg_groups отсутствует.
   */
  async getRoles(): Promise<{ id: number; name: string }[]> {
    return [
      { id: 1, name: 'Гость' },
      { id: 2, name: 'Клиент' },
      { id: 3, name: 'Агент' },
      { id: 4, name: 'Контрагент' },
      { id: 5, name: 'Плательщик' },
      { id: 6, name: 'Менеджер' },
      { id: 7, name: 'Администратор' },
    ];
  }
}

import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface User {
  id: number;
  telegram_id: number;
  chat_id: number;
  group_id: number;
  role_name: string;
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
    
    // Перевод роли на русский
    if (user && user.role_name) {
      user.role_name = this.translateRole(user.role_name.trim());
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
   * Получить всех зарегистрированных пользователей
   */
  async getRegisteredUsers(): Promise<User[]> {
    return await this.usersRepository.getRegisteredUsers();
  }

  /**
   * Получить пользователей, ожидающих регистрации
   */
  async getAwaitingRegistration(): Promise<User[]> {
    return await this.usersRepository.getAwaitingRegistration();
  }

  /**
   * Получить контрагентов
   */
  async getContractors(): Promise<User[]> {
    return await this.usersRepository.getContractors();
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
    return await this.usersRepository.updateGroup(userId, groupId);
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
    return await this.usersRepository.getUsersByGroupId(groupId);
  }
}

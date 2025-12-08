import { Update, Ctx, Start, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

/**
 * Главный обработчик обновлений бота
 * Реализует паттерн BotFather: inline клавиатуры с редактированием сообщений
 */
@Update()
export class BotUpdate {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Обработка команды /start
   * Отправляет новое сообщение с главным меню
   */
  @Start()
  async onStart(@Ctx() ctx: Context, @CurrentUser() user: User) {
    if (!ctx.from || !ctx.chat) {
      return;
    }

    if (!user || user.is_blocked) {
      await ctx.reply('❌ Доступ заблокирован. Обратитесь к администратору.');
      return;
    }

    if (!user.is_registered) {
      await ctx.reply(
        'Добро пожаловать! Ваша заявка на регистрацию отправлена администратору.\n' +
        'После одобрения вы получите уведомление и сможете пользоваться ботом.'
      );
      return;
    }

    // Главное меню с inline клавиатурой
    await ctx.reply(
      `Главное меню\nВаша роль: ${user.role_name}`,
      this.getMainMenuKeyboard(user.group_id)
    );
  }

  /**
   * Обработка callback запросов от inline кнопок
   */
  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: Context & { callbackQuery: any }, @CurrentUser() user: User) {
    const data = ctx.callbackQuery.data;
    
    try {
      // Парсинг callback data формата: action:entity:id:params
      const [action, entity, id, ...params] = data.split(':');

      // Обработка различных действий
      switch (action) {
        case 'menu':
          await this.handleMenuNavigation(ctx, entity, user);
          break;
        case 'view':
          await this.handleViewEntity(ctx, entity, id, user);
          break;
        case 'back':
          await this.handleBackNavigation(ctx, entity, id, user);
          break;
        // Дополнительные обработчики будут добавлены в модулях
        default:
          await ctx.answerCbQuery('Неизвестная команда');
      }
    } catch (error) {
      console.error('Ошибка обработки callback:', error);
      await ctx.answerCbQuery('Произошла ошибка');
    }
  }

  /**
   * Пример команды, доступной только администраторам
   */
  @Command('admin')
  @UseGuards(RolesGuard)
  @Roles(7) // Только администраторы
  async onAdminCommand(@Ctx() ctx: Context, @CurrentUser() user: User) {
    await ctx.reply(`Панель администратора\nВаш ID: ${user.id}`);
  }

  /**
   * Генерация главного меню с учетом прав пользователя
   */
  private getMainMenuKeyboard(roleId: number) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📚 Заказы', callback_data: 'menu:orders' },
          { text: '👥 Пользователи', callback_data: 'menu:users' },
          { text: '👤 Профиль', callback_data: 'menu:profile' },
        ],
        [
          { text: '📦 Отгрузки', callback_data: 'menu:shipments' },
          { text: '💰 Расходы', callback_data: 'menu:expenses' },
          { text: '💳 Касса', callback_data: 'menu:payments' },
        ],
        [
          { text: '🔍 Поиск', callback_data: 'menu:search' },
        ],
      ],
    };

    // Фильтрация доступных разделов по ролям
    // TODO: Реализовать полную логику доступа
    
    return { reply_markup: keyboard };
  }

  /**
   * Навигация по разделам меню
   */
  private async handleMenuNavigation(ctx: Context, section: string, user: User) {
    // TODO: Будет реализовано в соответствующих модулях
    await ctx.answerCbQuery();
    await ctx.editMessageText(`Раздел: ${section}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '◀️ Назад', callback_data: 'menu:main' }],
        ],
      },
    });
  }

  /**
   * Просмотр сущности
   */
  private async handleViewEntity(ctx: Context, entity: string, id: string, user: User) {
    // TODO: Будет реализовано в соответствующих модулях
    await ctx.answerCbQuery();
  }

  /**
   * Возврат назад по навигации
   */
  private async handleBackNavigation(ctx: Context, target: string, context: string, user: User) {
    if (!ctx.from) {
      return;
    }

    await ctx.answerCbQuery();
    
    if (target === 'main' || !target) {
      // Возврат в главное меню
      await ctx.editMessageText(
        `Главное меню\nВаша роль: ${user.role_name}`,
        this.getMainMenuKeyboard(user.group_id)
      );
    }
  }
}

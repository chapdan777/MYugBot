import { Update, Ctx, Start, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';

/**
 * Главный обработчик обновлений бота
 * Реализует паттерн BotFather: inline клавиатуры с редактированием сообщений
 */
@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Обработка команды /start
   * Отправляет новое сообщение с главным меню
   */
  @Start()
  async onStart(@Ctx() ctx: Context, @CurrentUser() user: User) {
    if (!ctx.from || !ctx.chat) {
      return;
    }

    if (!user) {
      await ctx.reply('❌ Ошибка авторизации. Попробуйте позже.');
      return;
    }

    if (user.is_blocked) {
      await ctx.reply('❌ Доступ заблокирован. Обратитесь к администратору.');
      return;
    }

    // TODO: Раскомментировать после первой регистрации
    // if (!user.is_registered) {
    //   await ctx.reply(
    //     'Добро пожаловать! Ваша заявка на регистрацию отправлена администратору.\n' +
    //     'После одобрения вы получите уведомление и сможете пользоваться ботом.'
    //   );
    //   return;
    // }

    // Главное меню с inline клавиатурой
    await ctx.reply(
      `Главное меню\nВаша роль: ${user.role_name || 'Гость'}`,
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
        case 'payments':
          await this.handlePaymentsAction(ctx, entity, id, params, user);
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
    await ctx.answerCbQuery();
    
    if (section === 'main') {
      // Возврат в главное меню
      await ctx.editMessageText(
        `Главное меню\nВаша роль: ${user.role_name || 'Гость'}`,
        this.getMainMenuKeyboard(user.group_id)
      );
      return;
    }

    if (section === 'payments') {
      await this.showPaymentsMainMenu(ctx, user);
      return;
    }

    // TODO: Будет реализовано в соответствующих модулях
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
        `Главное меню\nВаша роль: ${user.role_name || 'Гость'}`,
        this.getMainMenuKeyboard(user.group_id)
      );
      return;
    }

    if (target === 'payments') {
      await this.showPaymentsMainMenu(ctx, user);
      return;
    }
  }

  /**
   * Меню "Касса"
   */
  private async showPaymentsMainMenu(ctx: Context, user: User) {
    await ctx.editMessageText('💳 Касса', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🥬 Капуста', callback_data: 'payments:balance' },
          ],
          [
            { text: '📒 Журнал 7 дней', callback_data: 'payments:journal:7days' },
          ],
          [
            { text: '📘 Журнал сегодня', callback_data: 'payments:journal:today' },
          ],
          [
            { text: '◀️ Назад', callback_data: 'menu:main' },
          ],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }

  /**
   * Обработка действий кассы
   */
  private async handlePaymentsAction(
    ctx: Context & { callbackQuery: any },
    action: string,
    id: string,
    params: string[],
    user: User,
  ) {
    await ctx.answerCbQuery();

    switch (action) {
      case 'balance': {
        const balance = await this.paymentsService.getCashboxBalance();
        await ctx.editMessageText(`🥬 Капуста\nТекущий баланс: <b>${balance.toLocaleString('ru-RU')} ₽</b>`, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'back:payments' }]],
          },
          parse_mode: 'HTML',
        } as any);
        break;
      }
      case 'journal': {
        const period = id as '7days' | 'today'; // '7days' | 'today'
        await this.showJournalWithFilters(ctx, period);
        break;
      }
      case 'filter': {
        const period = id as '7days' | 'today'; // '7days' | 'today'
        const direction = params[0] as 'income' | 'expense' | 'all';
        await this.showJournalWithFilters(ctx, period, direction);
        break;
      }
      default:
        await ctx.answerCbQuery('Неизвестная команда кассы');
    }
  }

  /**
   * Показ журнала с фильтрами Приход/Расход
   */
  private async showJournalWithFilters(
    ctx: Context & { callbackQuery: any },
    period: '7days' | 'today',
    direction: 'income' | 'expense' | 'all' = 'all',
  ) {
    const today = new Date();
    let entries =
      period === '7days'
        ? await this.paymentsService.getCashFlowLastSevenDays()
        : await this.paymentsService.getCashFlowByDate(
            new Date().toISOString().split('T')[0],
          );

    if (direction === 'income') {
      entries = entries.filter((e) => e.moneysum > 0);
    } else if (direction === 'expense') {
      entries = entries.filter((e) => e.moneysum < 0);
    }

    const title =
      period === '7days'
        ? '📒 Журнал за 7 дней'
        : '📘 Журнал за сегодня';

    const text = `${title}\n\n${this.paymentsService.formatCashFlowForDisplay(entries)}`;

    await ctx.editMessageText(text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔹 Приход', callback_data: `payments:filter:${period}:income` },
            { text: '🔻 Расход', callback_data: `payments:filter:${period}:expense` },
          ],
          [
            { text: '📊 Все', callback_data: `payments:filter:${period}:all` },
          ],
          [
            { text: '◀️ Назад', callback_data: 'back:payments' },
          ],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }
}

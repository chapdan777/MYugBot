import { Update, Ctx, Start, Command, On, Hears } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { ShipmentsService } from '../shipments/shipments.service';
import type { ExtendedContext } from './types';

/**
 * Главный обработчик обновлений бота
 * Реализует паттерн BotFather: inline клавиатуры с редактированием сообщений
 */
@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
    private readonly shipmentsService: ShipmentsService,
  ) {}

  /**
   * Обработка команды /start
   * Отправляет новое сообщение с главным меню
   */
  @Start()
  async onStart(@Ctx() ctx: ExtendedContext, @CurrentUser() user: User) {
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
  async onCallbackQuery(@Ctx() ctx: ExtendedContext & { callbackQuery: any }, @CurrentUser() user: User) {
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
        case 'shipments':
          await this.handleShipmentsAction(ctx, entity, id, params, user);
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
   * Команда для просмотра деталей отгрузки (короткий формат)
   * Формат: /shp_pr1, /shp_fa2 и т.д. (1-based indexing)
   */
  @Hears(/^\/shp_(pr|fa)\d+$/)
  async onShipmentDetailShortCommand(@Ctx() ctx: ExtendedContext, @CurrentUser() user: User) {
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }
    
    const command = ctx.message.text.split(' ')[0].substring(1); // Remove the '/' prefix
    const params = ctx.message.text.split(' ').slice(1);
    
    // Parse command format: /shp_{type}{index}
    const commandMatch = command.match(/^shp_(pr|fa)(\d+)$/);
    if (!commandMatch) {
      await ctx.reply('❌ Неверный формат команды');
      return;
    }
    
    const type = commandMatch[1]; // 'pr' or 'fa'
    const displayIndex = parseInt(commandMatch[2], 10);
    
    // Convert from 1-based to 0-based indexing
    const index = displayIndex - 1;
    
    if (isNaN(index) || index < 0) {
      await ctx.reply('❌ Неверный индекс отгрузки');
      return;
    }
    
    // Get the stored shipments from cache (if available)
    const storedShipments = this.shipmentsService.getUserShipments(user.id);
    
    // Validate that we have the stored shipments and the index is valid
    if (!storedShipments || !Array.isArray(storedShipments) || index >= storedShipments.length) {
      await ctx.reply('❌ Данные отгрузки не найдены. Пожалуйста, откройте список отгрузок заново.');
      return;
    }
    
    // Get the specific shipment data
    const shipment = storedShipments[index];
    const isProfile = type === 'pr';
    const driverName = shipment.driver_name;
    // Handle different date formats properly - preserve original date without timezone conversion
    let shipmentDate: string;
    if (shipment.fact_date_out instanceof Date) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = shipment.fact_date_out.getFullYear();
      const month = String(shipment.fact_date_out.getMonth() + 1).padStart(2, '0');
      const day = String(shipment.fact_date_out.getDate()).padStart(2, '0');
      shipmentDate = `${year}-${month}-${day}`;
    } else if (typeof shipment.fact_date_out === 'string') {
      // If it's already a string in YYYY-MM-DD format, use it directly
      if ((shipment.fact_date_out as string).match(/^\d{4}-\d{2}-\d{2}$/)) {
        shipmentDate = shipment.fact_date_out;
      } else {
        // Otherwise, try to parse and format it properly
        const dateObj = new Date(shipment.fact_date_out);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        shipmentDate = `${year}-${month}-${day}`;
      }
    } else {
      // Try to parse the date and format it properly
      const dateObj = new Date(shipment.fact_date_out);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      shipmentDate = `${year}-${month}-${day}`;
    }
    
    try {
      // Delete the command message to keep chat clean
      if (ctx.message && ctx.message.message_id) {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (error) {
          // Message may have already been deleted or not exist
          console.debug('Не удалось удалить сообщение команды (возможно уже удалено):', error.message);
        }
      }
      
      // Получаем детали отгрузки
      const details = await this.shipmentsService.getShipmentDetails(driverName, shipmentDate, isProfile);
      
      // Форматируем для отображения
      const shipmentDateObj: Date = shipmentDate.includes('T') 
        ? new Date(shipmentDate)
        : (() => {
            // Assume YYYY-MM-DD format
            const parts = shipmentDate.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          })();
      const text = this.shipmentsService.formatShipmentDetailsForDisplay(details, driverName, shipmentDateObj);
      
      // Edit the original message with the details
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        // If this was triggered by a callback query, edit that message
        await ctx.editMessageText(text, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
          },
          parse_mode: 'HTML',
        } as any);
      } else {
        // If this was triggered by a command, delete the command message and edit the original list message
        try {
          if (ctx.message && ctx.message.message_id) {
            await ctx.deleteMessage(ctx.message.message_id);
          }
        } catch (error) {
          // Message may have already been deleted or not exist
          console.debug('Не удалось удалить сообщение команды (возможно уже удалено):', error.message);
        }
        
        // Try to edit the original shipment list message
        // We'll send a new message as fallback since we don't have a direct reference to the original message
        await ctx.reply(text, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
          },
          parse_mode: 'HTML',
        } as any);
      }
    } catch (error) {
      console.error('Ошибка получения деталей отгрузки:', error);
      await ctx.reply('❌ Ошибка получения деталей отгрузки');
    }
  }

  /**
   * Команда для просмотра деталей отгрузки
   * Формат: /shipment_profile_0, /shipment_facade_2 и т.д.
   */
  @Command('shipment_profile')
  @Command('shipment_facade')
  async onShipmentDetailCommand(@Ctx() ctx: ExtendedContext, @CurrentUser() user: User) {
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }
    
    const command = ctx.message.text.split(' ')[0].substring(1); // Remove the '/' prefix
    const params = ctx.message.text.split(' ').slice(1);
    
    // Parse command format: shipment_{type}_{index}
    const parts = command.split('_');
    if (parts.length !== 3) {
      await ctx.reply('❌ Неверный формат команды');
      return;
    }
    
    const type = parts[1]; // 'profile' or 'facade'
    const index = parseInt(parts[2], 10);
    
    if (isNaN(index)) {
      await ctx.reply('❌ Неверный индекс отгрузки');
      return;
    }
    
    // Get the stored shipments from cache (if available)
    const storedShipments = this.shipmentsService.getUserShipments(user.id);
    
    // Validate that we have the stored shipments and the index is valid
    if (!storedShipments || !Array.isArray(storedShipments) || index < 0 || index >= storedShipments.length) {
      await ctx.reply('❌ Данные отгрузки не найдены. Пожалуйста, откройте список отгрузок заново.');
      return;
    }
    
    // Get the specific shipment data
    const shipment = storedShipments[index];
    const isProfile = type === 'profile';
    const driverName = shipment.driver_name;
    // Handle different date formats properly - preserve original date without timezone conversion
    let shipmentDate: string;
    if (shipment.fact_date_out instanceof Date) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = shipment.fact_date_out.getFullYear();
      const month = String(shipment.fact_date_out.getMonth() + 1).padStart(2, '0');
      const day = String(shipment.fact_date_out.getDate()).padStart(2, '0');
      shipmentDate = `${year}-${month}-${day}`;
    } else if (typeof shipment.fact_date_out === 'string') {
      // If it's already a string in YYYY-MM-DD format, use it directly
      if ((shipment.fact_date_out as string).match(/^\d{4}-\d{2}-\d{2}$/)) {
        shipmentDate = shipment.fact_date_out;
      } else {
        // Otherwise, try to parse and format it properly
        const dateObj = new Date(shipment.fact_date_out);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        shipmentDate = `${year}-${month}-${day}`;
      }
    } else {
      // Try to parse the date and format it properly
      const dateObj = new Date(shipment.fact_date_out);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      shipmentDate = `${year}-${month}-${day}`;
    }
    
    try {
      // Delete the command message to keep chat clean
      if (ctx.message && ctx.message.message_id) {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (error) {
          // Message may have already been deleted or not exist
          console.debug('Не удалось удалить сообщение команды (возможно уже удалено):', error.message);
        }
      }
      
      // Получаем детали отгрузки
      const details = await this.shipmentsService.getShipmentDetails(driverName, shipmentDate, isProfile);
      
      // Форматируем для отображения
      const shipmentDateObj: Date = shipmentDate.includes('T') 
        ? new Date(shipmentDate)
        : (() => {
            // Assume YYYY-MM-DD format
            const parts = shipmentDate.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          })();
      const text = this.shipmentsService.formatShipmentDetailsForDisplay(details, driverName, shipmentDateObj);
      
      // Edit the original message with the details
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        // If this was triggered by a callback query, edit that message
        await ctx.editMessageText(text, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
          },
          parse_mode: 'HTML',
        } as any);
      } else {
        // If this was triggered by a command, delete the command message and edit the original list message
        try {
          if (ctx.message && ctx.message.message_id) {
            await ctx.deleteMessage(ctx.message.message_id);
          }
        } catch (error) {
          // Message may have already been deleted or not exist
          console.debug('Не удалось удалить сообщение команды (возможно уже удалено):', error.message);
        }
        
        // Try to edit the original shipment list message
        // We'll send a new message as fallback since we don't have a direct reference to the original message
        await ctx.reply(text, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
          },
          parse_mode: 'HTML',
        } as any);
      }
    } catch (error) {
      console.error('Ошибка получения деталей отгрузки:', error);
      await ctx.reply('❌ Ошибка получения деталей отгрузки');
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
  private async handleMenuNavigation(ctx: ExtendedContext, section: string, user: User) {
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

    if (section === 'shipments') {
      await this.showShipmentsMainMenu(ctx, user);
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
  private async handleViewEntity(ctx: ExtendedContext, entity: string, id: string, user: User) {
    if (entity === 'order') {
      // TODO: Реализовать просмотр деталей заказа
      await ctx.answerCbQuery();
      await ctx.editMessageText(`Заказ №${id}\n\nДетали заказа будут здесь.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'menu:main' }]],
        },
        parse_mode: 'HTML',
      } as any);
      return;
    }
    
    // TODO: Будет реализовано в соответствующих модулях
    await ctx.answerCbQuery();
  }

  /**
   * Возврат назад по навигации
   */
  private async handleBackNavigation(ctx: ExtendedContext, target: string, context: string, user: User) {
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
  private async showPaymentsMainMenu(ctx: ExtendedContext, user: User) {
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
   * Меню "Отгрузки"
   */
  private async showShipmentsMainMenu(ctx: ExtendedContext, user: User) {
    await ctx.editMessageText('📦 Отгрузки', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 Профиль (5 последних)', callback_data: 'shipments:list:profile' },
          ],
          [
            { text: '📋 Фасады (5 последних)', callback_data: 'shipments:list:facade' },
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
    ctx: ExtendedContext & { callbackQuery: any },
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
   * Обработка действий отгрузок
   */
  private async handleShipmentsAction(
    ctx: ExtendedContext & { callbackQuery: any },
    action: string,
    id: string,
    params: string[],
    user: User,
  ) {
    await ctx.answerCbQuery();

    if (action === 'list') {
      const isProfile = id === 'profile';
      const type = isProfile ? 'профиля' : 'фасадов';
      
      try {
        // Получаем последние 5 отгрузок
        const shipments = await this.shipmentsService.getShipmentsList(isProfile);
        const latestShipments = shipments.slice(0, 5);
        
        // Форматируем для отображения
        const text = this.shipmentsService.formatShipmentsListForDisplay(latestShipments, type);
        
        // Создаем текст со ссылками на команды в формате как в примере
        let displayText = `Отгрузки ${type} (${latestShipments.length}):\n\n`;
        
        latestShipments.forEach((shipment, index) => {
          // Handle potentially undefined shipment properties
          if (!shipment.fact_date_out || !shipment.driver_name) {
            console.warn('Пропущена отгрузка с отсутствующими данными:', shipment);
            return;
          }
          
          // Format date for display
          const displayDate = shipment.fact_date_out.toLocaleDateString('ru-RU');
          
          // Create a compact command link for each shipment (starting from 1, not 0)
          const commandType = isProfile ? 'pr' : 'fa';
          const displayIndex = index + 1; // Start from 1 instead of 0
          displayText += `${displayIndex}. ${displayDate} /shp_${commandType}${displayIndex}\n`;
          displayText += `🚚 Водитель: ${shipment.driver_name}\n`;
          displayText += `📦 Упаковок: ${shipment.box !== undefined ? shipment.box : 0}\n`;
          displayText += `💰 Сумма: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(shipment.amount !== undefined ? shipment.amount : 0)}\n`;
          displayText += `${'—'.repeat(16)}\n`;
        });
        
        // Store the current shipments list in cache for later retrieval
        this.shipmentsService.setUserShipments(user.id, latestShipments);
        
        await ctx.editMessageText(displayText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '◀️ Назад', callback_data: 'menu:shipments' }]
            ],
          },
          parse_mode: 'HTML',
        } as any);
      } catch (error) {
        console.error('Ошибка получения списка отгрузок:', error);
        await ctx.editMessageText(`❌ Ошибка получения отгрузок ${type}`, {
          reply_markup: {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'menu:shipments' }]],
          },
        });
      }
    }
    else if (action === 'detail') {
      await ctx.answerCbQuery();
      await ctx.editMessageText('❌ Эта функция больше не используется. Пожалуйста, используйте команды из списка отгрузок.', {
        reply_markup: {
          inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'menu:shipments' }]],
        },
      });
    }
  }

  /**
   * Показ журнала с фильтрами Приход/Расход
   */
  private async showJournalWithFilters(
    ctx: ExtendedContext & { callbackQuery: any },
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

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
import { OrdersService, Order } from '../orders/orders.service';
import type { ExtendedContext } from './types';
import { InlineKeyboardButton } from 'telegraf/types';

/**
 * Главный обработчик обновлений бота
 * Реализует паттерн BotFather: inline клавиатуры с редактированием сообщений
 */
@Update()
export class BotUpdate {
  // Хранилище последнего поискового запроса (общий для всех пользователей)
  private lastSearchQuery: string = '38148';

  constructor(
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Проверка прав на просмотр цен
   * Цены доступны только Плательщикам, Администраторам, Менеджерам
   */
  private canSeePrices(user: User): boolean {
    const allowedRoles = ['Плательщик', 'Администратор', 'Менеджер'];
    return !!user.role_name && allowedRoles.includes(user.role_name);
  }

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

    await ctx.reply(
      `Главное меню\nВаша роль: ${user.role_name || 'Гость'}`,
      this.getMainMenuKeyboard(user.group_id, ctx.from.id)
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
        case 'order':
          await this.handleOrderAction(ctx, entity, id, params, user);
          break;
        case 'users':
          await this.handleUsersAction(ctx, entity, id, params, user);
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
      
      // Get saved message reference to edit it
      const savedMessage = this.shipmentsService.getLastListMessage(user.id);
      
      if (savedMessage && ctx.telegram) {
        // Edit the saved shipment list message
        try {
          await ctx.telegram.editMessageText(
            savedMessage.chatId,
            savedMessage.messageId,
            undefined,
            text,
            {
              reply_markup: {
                inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
              },
              parse_mode: 'HTML',
            } as any
          );
        } catch (error) {
          console.error('Не удалось отредактировать сообщение со списком:', error.message);
          // Fallback: send new message if editing fails
          await ctx.reply(text, {
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
            },
            parse_mode: 'HTML',
          } as any);
        }
      } else {
        // Fallback: send new message if no saved reference
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
      
      // Get saved message reference to edit it
      const savedMessage = this.shipmentsService.getLastListMessage(user.id);
      
      if (savedMessage && ctx.telegram) {
        // Edit the saved shipment list message
        try {
          await ctx.telegram.editMessageText(
            savedMessage.chatId,
            savedMessage.messageId,
            undefined,
            text,
            {
              reply_markup: {
                inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
              },
              parse_mode: 'HTML',
            } as any
          );
        } catch (error) {
          console.error('Не удалось отредактировать сообщение со списком:', error.message);
          // Fallback: send new message if editing fails
          await ctx.reply(text, {
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Назад', callback_data: `shipments:list:${isProfile ? 'profile' : 'facade'}` }]],
            },
            parse_mode: 'HTML',
          } as any);
        }
      } else {
        // Fallback: send new message if no saved reference
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
   * Команда для просмотра деталей заказа
   * Формат: /id39148
   */
  @Hears(/^\/id\d+$/)
  async onOrderDetailCommand(@Ctx() ctx: ExtendedContext, @CurrentUser() user: User) {
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }
    
    const command = ctx.message.text.trim();
    const orderIdMatch = command.match(/^\/id(\d+)$/);
    
    if (!orderIdMatch) {
      await ctx.reply('❌ Неверный формат команды');
      return;
    }
    
    const orderId = parseInt(orderIdMatch[1], 10);
    
    try {
      // Delete the command message to keep chat clean
      if (ctx.message && ctx.message.message_id) {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (error) {
          console.debug('Не удалось удалить сообщение команды:', error.message);
        }
      }
      
      // Проверяем, откуда пришел пользователь
      const savedMessage = this.shipmentsService.getLastListMessage(user.id);
      // Если есть сохраненное сообщение и оно из отгрузок - не из поиска
      const fromSearch = !savedMessage || savedMessage.fromSearch !== false;
      await this.showOrderDetails(ctx, orderId, user, fromSearch);
    } catch (error) {
      console.error('Ошибка получения деталей заказа:', error);
      await ctx.reply('❌ Ошибка получения деталей заказа');
    }
  }

  /**
   * Обработка текстовых сообщений - поиск заказов
   */
  @On('text')
  async onText(@Ctx() ctx: ExtendedContext, @CurrentUser() user: User) {
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    const text = ctx.message.text.trim();
    
    // Игнорируем команды (начинающиеся с /)
    if (text.startsWith('/')) {
      return;
    }

    // Сохраняем последний поисковый запрос
    this.lastSearchQuery = text;

    try {
      // Удаляем сообщение с запросом
      if (ctx.message && ctx.message.message_id) {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (error) {
          console.debug('Не удалось удалить сообщение запроса:', error.message);
        }
      }

      // Поиск заказов
      await this.searchOrders(ctx, text, user);
    } catch (error) {
      console.error('Ошибка поиска заказов:', error);
      await ctx.reply('❌ Ошибка поиска заказов');
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
  private getMainMenuKeyboard(roleId: number, chatId?: number) {
    const buttons = [
      [
        { text: '📚 Заказы', callback_data: 'menu:orders' },
        { text: '👥 Пользователи', callback_data: 'menu:users' },
        { text: '👤 Профиль', callback_data: 'menu:profile' },
      ],
      [
        { text: '📦 Отгрузки', callback_data: 'menu:shipments' },
      ],
    ];
    
    // Кнопка "Касса" доступна только для chatID 582657818 и 1805605563
    if (chatId && (chatId === 582657818 || chatId === 1805605563)) {
      buttons[1].push({ text: '💳 Касса', callback_data: 'menu:payments' });
    }

    const keyboard = {
      inline_keyboard: buttons,
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
        this.getMainMenuKeyboard(user.group_id, ctx.from?.id)
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

    if (section === 'orders') {
      await this.showOrdersMainMenu(ctx, user);
      return;
    }

    if (section === 'profile') {
      await this.showUserProfile(ctx, user);
      return;
    }

    if (section === 'users') {
      await this.showUsersMainMenu(ctx, user);
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
        this.getMainMenuKeyboard(user.group_id, ctx.from?.id)
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
            { text: '📒 Журнал 7 дней', callback_data: 'payments:journal:7days:page:1' },
          ],
          [
            { text: '📘 Журнал сегодня', callback_data: 'payments:journal:today:page:1' },
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
          [
            { text: '🏠 Главное меню', callback_data: 'menu:main' },
          ],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }

  /**
   * Меню "Заказы"
   */
  private async showOrdersMainMenu(ctx: ExtendedContext, user: User) {
    const sentMessage = await ctx.editMessageText(
      `📚 Заказы\n\nℹ️ Для поиска заказа, набери текст, например: ${this.lastSearchQuery}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '◀️ Назад', callback_data: 'menu:main' },
            ],
          ],
        },
        parse_mode: 'HTML',
      } as any
    );
    
    // Сохраняем сообщение меню "Заказы" для последующего редактирования результатами поиска
    if (sentMessage && ctx.chat) {
      this.shipmentsService.setLastListMessage(user.id, {
        chatId: ctx.chat.id,
        messageId: (sentMessage as any).message_id,
        fromSearch: true,
      });
    }
  }

  /**
   * Показать профиль пользователя
   */
  private async showUserProfile(ctx: ExtendedContext, user: User) {
    let profileText = `👤 Профиль\n\n`;
    profileText += `🆔 ID: ${user.id}\n`;
    if (user.telegram_id) profileText += `📱 Telegram ID: ${user.telegram_id}\n`;
    if (user.username) profileText += `👤 Username: @${user.username}\n`;
    if (user.first_name) profileText += `👨 Имя: ${user.first_name}\n`;
    if (user.last_name) profileText += `👨 Фамилия: ${user.last_name}\n`;
    if (user.role_name) profileText += `💼 Роль: ${user.role_name}\n`;
    if (user.group_id) profileText += `📂 Group ID: ${user.group_id}\n`;
    profileText += `🔒 Зарегистрирован: ${user.is_registered ? '✅ Да' : '❌ Нет'}\n`;
    profileText += `🚫 Заблокирован: ${user.is_blocked ? '✅ Да' : '❌ Нет'}\n`;

    await ctx.editMessageText(profileText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '◀️ Назад', callback_data: 'menu:main' },
          ],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }

  /**
   * Меню "Пользователи"
   */
  private async showUsersMainMenu(ctx: ExtendedContext, user: User, page = 1) {
    // Проверка прав доступа
    if (user.role_name !== 'Администратор') {
      await ctx.editMessageText('❌ Доступ запрещен', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: 'menu:main' }],
          ],
        },
      });
      return;
    }

    const allUsers = await this.usersService.getAllUsers();
    const usersPerPage = 5;
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersOnPage = allUsers.slice(startIndex, endIndex);

    const text = `👥 Пользователи (Страница ${page}/${totalPages})`;
    const currentPage = page;

    const userButtons: InlineKeyboardButton[][] = usersOnPage.map(user => ([
      { text: `👁 ${user.first_name}`, callback_data: `users:view:${user.id}:page:${currentPage}` }
    ]));

    const navigationRow: InlineKeyboardButton[] = [];
    if (totalPages > 1) {
      if (page > 1) {
        navigationRow.push({ text: '◀️', callback_data: `users:list:page:${page - 1}` });
      }
      navigationRow.push({ text: `[ ${page}/${totalPages} ]`, callback_data: ' ' });
      if (page < totalPages) {
        navigationRow.push({ text: '▶️', callback_data: `users:list:page:${page + 1}` });
      }
    }

    const keyboard = [
      ...userButtons,
      navigationRow,
      [{ text: '◀️ Назад', callback_data: 'menu:main' }],
    ].filter(row => row.length > 0);

    await ctx.editMessageText(text, {
      reply_markup: {
        inline_keyboard: keyboard,
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
        const period = id as '7days' | 'today';
        const page = params[0] === 'page' ? parseInt(params[1], 10) : 1;
        await this.showJournalWithFilters(ctx, period, 'all', page);
        break;
      }
      case 'filter': {
        const period = id as '7days' | 'today';
        const direction = params[0] as 'income' | 'expense' | 'all';
        const page = params[1] === 'page' ? parseInt(params[2], 10) : 1;
        await this.showJournalWithFilters(ctx, period, direction, page);
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
        
        const sentMessage = await ctx.editMessageText(displayText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '◀️ Назад', callback_data: 'menu:shipments' }]
            ],
          },
          parse_mode: 'HTML',
        } as any);
        
        // Save the message reference for later editing
        if (sentMessage && ctx.chat) {
          this.shipmentsService.setLastListMessage(user.id, {
            chatId: ctx.chat.id,
            messageId: (sentMessage as any).message_id,
            isProfile,
            fromSearch: false, // Маркер "из отгрузок"
          });
        }
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
    page: number = 1,
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
        
    const limit = 10;
    const { text: formattedText, totalPages } = this.paymentsService.formatCashFlowForDisplay(entries, page, limit);

    const text = `${title}\n\n${formattedText}`;

    const navigationButtons: { text: string; callback_data: string }[][] = [];
    if (totalPages > 1) {
      const row: { text: string; callback_data: string }[] = [];
      if (page > 1) {
        row.push({ text: '◀️ Назад', callback_data: `payments:filter:${period}:${direction}:page:${page - 1}` });
      }
      row.push({ text: `[ ${page} / ${totalPages} ]`, callback_data: ' ' }); // Просто текст
      if (page < totalPages) {
        row.push({ text: 'Вперед ▶️', callback_data: `payments:filter:${period}:${direction}:page:${page + 1}` });
      }
      navigationButtons.push(row);
    }

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
          ...navigationButtons,
          [
            { text: '◀️ Назад', callback_data: 'back:payments' },
          ],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }

  /**
   * Обработка действий с заказами
   */
  private async handleOrderAction(
    ctx: ExtendedContext & { callbackQuery: any },
    action: string,
    id: string,
    params: string[],
    user: User,
  ) {
    await ctx.answerCbQuery();

    if (action === 'show_elements') {
      const orderId = parseInt(id, 10);
      // Параметр контекста: 'search' или 'shipment'
      const context = params[0] || 'shipment';
      const fromSearch = context === 'search';
      
      try {
        console.log(`Попытка получения элементов заказа №${orderId} для пользователя ${user.id}, контекст: ${context}`);
        
        // Получаем заказ и элементы
        const order = await this.ordersService.getOrderById(orderId);
        
        if (!order) {
          console.log(`Заказ №${orderId} не найден в базе данных`);
          await ctx.editMessageText(`❌ Заказ №${orderId} не найден`);
          return;
        }
        
        console.log(`Заказ №${orderId} найден, получаем элементы...`);
        const elements = await this.ordersService.getOrderElements(orderId);
        console.log(`Получено ${elements.length} элементов для заказа №${orderId}`);
        
        // Форматируем шапку + элементы
        const showPrices = this.canSeePrices(user);
        const headerText = this.ordersService.formatOrderForDisplay(order, elements, showPrices);
        const elementsText = this.ordersService.formatOrderElementsForDisplay(elements);
        const fullText = headerText + elementsText;
        
        // Определяем кнопку "Назад" в зависимости от контекста
        let backButton;
        if (fromSearch) {
          // Из поиска - возвращаемся в меню заказов
          backButton = { text: '◀️ Назад', callback_data: 'menu:orders' };
        } else {
          // Из отгрузок - проверяем savedMessage
          const savedMessage = this.shipmentsService.getLastListMessage(user.id);
          if (savedMessage && savedMessage.isProfile !== undefined) {
            backButton = { text: '◀️ Назад', callback_data: `shipments:list:${savedMessage.isProfile ? 'profile' : 'facade'}` };
          } else {
            backButton = { text: '◀️ Назад', callback_data: 'menu:orders' };
          }
        }
        
        console.log(`Отправляем сообщение с элементами заказа №${orderId}`);
        await ctx.editMessageText(fullText, {
          reply_markup: {
            inline_keyboard: [
              [backButton],
              [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
            ],
          },
          parse_mode: 'HTML',
        } as any);
      } catch (error) {
        console.error('Ошибка получения элементов заказа:', error);
        console.error('Детали ошибки:', {
          orderId: id,
          errorMessage: error.message,
          errorStack: error.stack,
        });
        await ctx.editMessageText('❌ Ошибка получения элементов заказа');
      }
    }
  }

  /**
   * Поиск заказов по текстовому запросу
   */
  private async searchOrders(ctx: ExtendedContext, searchText: string, user: User) {
    try {
      // Проверяем, является ли запрос числом (ID заказа)
      const isNumeric = /^\d+$/.test(searchText);
      let orders: Order[] = [];

      if (isNumeric) {
        // Поиск по ID или номеру
        orders = await this.ordersService.searchOrdersByIdOrNumber(searchText);
      } else {
        // Поиск по ключевым словам
        const keywords = searchText.split(/\s+/).filter(k => k.length > 0);
        orders = await this.ordersService.searchOrdersByKeywords(keywords);
      }

      if (orders.length === 0) {
        await ctx.reply(`❌ Заказы по запросу "${searchText}" не найдены`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
            ],
          },
        } as any);
        return;
      }

      if (orders.length === 1) {
        // Если найден только один заказ, сразу открываем его
        // Очищаем сохраненное сообщение из отгрузок
        this.shipmentsService.clearLastListMessage(user.id);
        await this.showOrderDetails(ctx, orders[0].id, user, true);
        return;
      }

      // Если найдено несколько заказов, показываем список
      let text = `🔍 Найдено заказов: ${orders.length}\n\n`;

      orders.slice(0, 10).forEach((order, index) => {
        text += `${index + 1}. Заказ №${order.id}`;
        if (order.clientname) text += ` - ${order.clientname}`;
        if (order.status_description) text += ` (${order.status_description})`;
        text += `\n   📂 /id${order.id}\n\n`;
      });

      if (orders.length > 10) {
        text += `\n... и ещё ${orders.length - 10} заказов. Уточните запрос.\n`;
      }
      
      // Проверяем, есть ли сохраненное сообщение меню "Заказы"
      const savedMessage = this.shipmentsService.getLastListMessage(user.id);
      let sentMessage: any;
      
      if (savedMessage && savedMessage.fromSearch && ctx.telegram) {
        // Редактируем сохраненное сообщение меню
        try {
          await ctx.telegram.editMessageText(
            savedMessage.chatId,
            savedMessage.messageId,
            undefined,
            text,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
                ],
              },
              parse_mode: 'HTML',
            } as any
          );
          // Сохраняем ту же ссылку, так как сообщение осталось тем же
          return; // Успешно отредактировали
        } catch (error) {
          console.debug('Не удалось отредактировать сообщение меню, отправляем новое:', error.message);
        }
      }
      
      // Fallback: отправляем новое сообщение
      sentMessage = await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
          ],
        },
        parse_mode: 'HTML',
      } as any);
      
      // Сохраняем сообщение со списком поиска для последующего редактирования
      if (sentMessage && ctx.chat) {
        this.shipmentsService.setLastListMessage(user.id, {
          chatId: ctx.chat.id,
          messageId: (sentMessage as any).message_id,
          fromSearch: true, // Маркер "из поиска"
        });
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      throw error;
    }
  }

  /**
   * Показать детали заказа
   */
  private async showOrderDetails(ctx: ExtendedContext, orderId: number, user: User, fromSearch: boolean = false) {
    // Получаем заказ и его элементы
    const order = await this.ordersService.getOrderById(orderId);
    
    if (!order) {
      await ctx.reply(`❌ Заказ №${orderId} не найден`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
          ],
        },
      } as any);
      return;
    }
    
    const elements = await this.ordersService.getOrderElements(orderId);
    
    // Форматируем шапку заказа
    const showPrices = this.canSeePrices(user);
    const headerText = this.ordersService.formatOrderForDisplay(order, elements, showPrices);
    
    // Get saved message reference (from shipments list or search list)
    const savedMessage = this.shipmentsService.getLastListMessage(user.id);
    console.log(`[showOrderDetails] savedMessage:`, JSON.stringify(savedMessage));
    console.log(`[showOrderDetails] fromSearch parameter:`, fromSearch);
    
    // Определяем кнопки навигации и callback для "Показать элементы"
    let backButton;
    let context: 'search' | 'shipment';
    
    if (fromSearch || (savedMessage && savedMessage.fromSearch)) {
      // Из поиска
      console.log(`[showOrderDetails] Context detected: SEARCH`);
      backButton = { text: '◀️ Назад', callback_data: 'menu:orders' };
      context = 'search';
    } else if (savedMessage && savedMessage.isProfile !== undefined) {
      // Из отгрузок
      console.log(`[showOrderDetails] Context detected: SHIPMENT (isProfile=${savedMessage.isProfile})`);
      backButton = { text: '◀️ Назад', callback_data: `shipments:list:${savedMessage.isProfile ? 'profile' : 'facade'}` };
      context = 'shipment';
    } else {
      // По умолчанию
      console.log(`[showOrderDetails] Context detected: DEFAULT (no saved message)`);
      backButton = { text: '◀️ Назад', callback_data: 'menu:orders' };
      context = 'search';
    }
    
    // callback для кнопки "Показать элементы"
    const showElementsCallback = `order:show_elements:${orderId}:${context}`;
    
    // Пытаемся отредактировать сохраненное сообщение (из отгрузок или поиска)
    if (savedMessage && ctx.telegram) {
      try {
        await ctx.telegram.editMessageText(
          savedMessage.chatId,
          savedMessage.messageId,
          undefined,
          headerText,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📝 Показать элементы', callback_data: showElementsCallback }],
                [backButton],
                [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
              ],
            },
            parse_mode: 'HTML',
          } as any
        );
        // Успешно отредактировали, выходим
        return;
      } catch (error) {
        console.debug('Не удалось отредактировать сообщение, отправляем новое:', error.message);
      }
    }
    
    // Fallback: отправляем новое сообщение, если не удалось отредактировать
    const sentMessage = await ctx.reply(headerText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Показать элементы', callback_data: showElementsCallback }],
          [backButton],
          [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
        ],
      },
      parse_mode: 'HTML',
    } as any);
    
    // Сохраняем новое сообщение
    if (sentMessage && ctx.chat) {
      this.shipmentsService.setLastListMessage(user.id, {
        chatId: ctx.chat.id,
        messageId: (sentMessage as any).message_id,
        fromSearch: context === 'search',
        isProfile: context === 'shipment' ? savedMessage?.isProfile : undefined,
      });
    }
  }

  /**
   * Обработка действий пользователей
   */
  private async handleUsersAction(
    ctx: ExtendedContext & { callbackQuery: any },
    action: string,
    id: string,
    params: string[],
    user: User,
  ) {
    await ctx.answerCbQuery();

    switch (action) {
      case 'list': {
        const page = params[0] === 'page' ? parseInt(params[1], 10) : 1;
        await this.showUsersMainMenu(ctx, user, page);
        break;
      }
      case 'view': {
        const userId = parseInt(id, 10);
        const fromPage = params[0] === 'page' ? parseInt(params[1], 10) : 1;
        await this.showUserView(ctx, userId, fromPage);
        break;
      }
      case 'toggle_block': {
        const userId = parseInt(id, 10);
        const isBlocked = params[0] === '1';
        const fromPage = parseInt(params[1], 10);
        if (isBlocked) {
          await this.usersService.unblockUser(userId);
        } else {
          await this.usersService.blockUser(userId);
        }
        await this.showUserView(ctx, userId, fromPage);
        break;
      }
      case 'register': {
        const userId = parseInt(id, 10);
        const fromPage = parseInt(params[0], 10);
        await this.usersService.registerUser(userId);
        await this.showUserView(ctx, userId, fromPage);
        break;
      }
      case 'change_role_menu': {
        const userId = parseInt(id, 10);
        const fromPage = parseInt(params[0], 10);
        await this.showChangeRoleMenu(ctx, userId, fromPage);
        break;
      }
      case 'change_role': {
        const userId = parseInt(id, 10);
        const roleId = parseInt(params[0], 10);
        const fromPage = parseInt(params[1], 10);
        await this.usersService.updateGroup(userId, roleId);
        await this.showUserView(ctx, userId, fromPage);
        break;
      }
    }
  }

  /**
   * Показать профиль конкретного пользователя (админ-панель)
   */
  private async showUserView(ctx: ExtendedContext, userId: number, fromPage: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      await ctx.editMessageText('❌ Пользователь не найден', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: `users:list:page:${fromPage}` }],
          ],
        },
      });
      return;
    }

    let profileText = `👤 Профиль пользователя\n\n`;
    profileText += `🆔 ID: ${user.id}\n`;
    if (user.telegram_id) profileText += `📱 Telegram ID: ${user.telegram_id}\n`;
    if (user.username) profileText += `👤 Username: @${user.username}\n`;
    if (user.first_name) profileText += `👨 Имя: ${user.first_name}\n`;
    if (user.last_name) profileText += `👨 Фамилия: ${user.last_name}\n`;
    if (user.role_name) profileText += `💼 Роль: ${user.role_name}\n`;
    if (user.group_id) profileText += `📂 Group ID: ${user.group_id}\n`;
    profileText += `🔒 Зарегистрирован: ${user.is_registered ? '✅ Да' : '❌ Нет'}\n`;
    profileText += `🚫 Заблокирован: ${user.is_blocked ? '✅ Да' : '❌ Нет'}\n`;

    const keyboard: InlineKeyboardButton[][] = [];

    keyboard.push([
      {
        text: `🚫 ${user.is_blocked ? 'Анблок' : 'Блок'}`,
        callback_data: `users:toggle_block:${user.id}:${user.is_blocked ? 1 : 0}:${fromPage}`,
      },
    ]);

    if (!user.is_registered) {
      keyboard.push([
        {
          text: '✅ Зарегистрировать',
          callback_data: `users:register:${user.id}:${fromPage}`,
        },
      ]);
    }

    keyboard.push([
      {
        text: '💼 Изменить роль',
        callback_data: `users:change_role_menu:${user.id}:${fromPage}`,
      },
    ]);

    keyboard.push([
      { text: '◀️ Назад', callback_data: `users:list:page:${fromPage}` },
    ]);

    await ctx.editMessageText(profileText, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
      parse_mode: 'HTML',
    } as any);
  }

  /**
   * Показать меню смены роли
   */
  private async showChangeRoleMenu(ctx: ExtendedContext, userId: number, fromPage: number) {
    const roles = await this.usersService.getRoles();
    const user = await this.usersService.findById(userId);

    if (!user) {
      await ctx.editMessageText('❌ Пользователь не найден');
      return;
    }

    const roleButtons: InlineKeyboardButton[][] = roles.map(role => ([
      {
        text: `${user.group_id === role.id ? '✅' : ''} ${role.name}`,
        callback_data: `users:change_role:${userId}:${role.id}:${fromPage}`,
      }
    ]));

    const text = `Выберите новую роль для ${user.first_name}`;

    await ctx.editMessageText(text, {
      reply_markup: {
        inline_keyboard: [
          ...roleButtons,
          [{ text: '◀️ Назад', callback_data: `users:view:${userId}:page:${fromPage}` }],
        ],
      },
      parse_mode: 'HTML',
    } as any);
  }
}

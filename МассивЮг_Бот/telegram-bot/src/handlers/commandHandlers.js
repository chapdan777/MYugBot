const { enqueueMessage } = require('../controllers/botController');
const userService = require('../services/userService');

module.exports = {
  start: async (bot, appState, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;
    const username = msg.from.username;

    try {
      // Ищем пользователя в базе данных
      const authResult = await userService.authenticate({ chatId });
      let user = authResult.user;
      let isNewUser = false;

      // Если пользователь не найден - создаём нового гостя
      if (!user) {
        console.log('[start] User not found, creating new guest:', chatId);
        const newUser = await userService.registerGuest({
          userId: chatId,
          firstName: firstName || 'Гость',
          lastName,
          username,
          groupId: 1
        });
        
        if (newUser) {
          // Перезагружаем пользователя из БД
          const reloadResult = await userService.authenticate({ chatId });
          user = reloadResult.user;
          isNewUser = true;
        }
      }

      if (!user) {
        enqueueMessage(chatId, 'Ошибка инициализации. Попробуйте позже.');
        return;
      }

      // Определяем роль
      const groupId = user.GROUP_ID || 1;
      const groupNames = {
        1: 'Гость',
        2: 'Клиент',
        3: 'Агент',
        4: 'Контрагент',
        5: 'Плательщик',
        6: 'Менеджер',
        7: 'Администратор'
      };
      const roleName = groupNames[groupId] || 'Гость';

      // Создаём или обновляем сессию
      appState.sessions.set(chatId, {
        userId: user.ID,
        chatId: user.CHAT_ID,
        groupId: groupId,
        firstName: user.FIRST_NAME,
        lastName: user.LAST_NAME,
        username: user.USER_NAME,
        isRegistered: Boolean(user.IS_REGISTERED),
        isBlocked: Boolean(user.IS_BLOCKED),
        state: 'Idle',
        context: { groupId },
        lastActivity: Date.now(),
        currentCommand: '/start',
        tempData: {},
        dbUser: user
      });

      console.log(`[start] User ${chatId} authenticated: groupId=${groupId}, role=${roleName}`);

      // Проверяем блокировку
      if (user.IS_BLOCKED) {
        enqueueMessage(chatId, 'Доступ запрещен.');
        return;
      }

      // Приветствие
      if (isNewUser && !user.IS_REGISTERED) {
        const welcomeMsg = `Привет ${user.FIRST_NAME}!\nТвой запрос на регистрацию отправлен и будет рассмотрен в ближайшее время.\nПосле регистрации тебе будут доступны новые возможности.`;
        enqueueMessage(chatId, welcomeMsg);
        
        // Уведомляем администраторов о новом пользователе
        const adminSessions = Array.from(appState.sessions.values()).filter(s => s.groupId === 7);
        adminSessions.forEach(admin => {
          enqueueMessage(admin.chatId, `Новый пользователь ${user.FIRST_NAME} подал заявку на регистрацию.`);
        });
      } else {
        enqueueMessage(chatId, `Добро пожаловать, ${user.FIRST_NAME}! Роль: ${roleName}. Используйте /menu для навигации.`);
      }
    } catch (error) {
      console.error('[start] Authentication error:', error);
      enqueueMessage(chatId, 'Ошибка подключения к базе данных. Попробуйте позже.');
    }
  },
  help: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    enqueueMessage(chatId, 'Доступные команды:\n/start - инициализация\n/help - справка\n/menu - главное меню');
  },
  menu: async (bot, appState, msg) => {
    const chatId = msg.chat.id;
    let session = appState.sessions.get(chatId);
    
    // Если сессии нет - загружаем пользователя из БД
    if (!session) {
      try {
        const authResult = await userService.authenticate({ chatId });
        if (authResult.user) {
          const user = authResult.user;
          const groupId = user.GROUP_ID || 1;
          session = {
            userId: user.ID,
            chatId: user.CHAT_ID,
            groupId: groupId,
            firstName: user.FIRST_NAME,
            state: 'Idle',
            context: { groupId },
            lastActivity: Date.now(),
            dbUser: user
          };
          appState.sessions.set(chatId, session);
          console.log(`[menu] Session restored for user ${chatId}, groupId=${groupId}`);
        } else {
          enqueueMessage(chatId, 'Пожалуйста, используйте /start для инициализации.');
          return;
        }
      } catch (error) {
        console.error('[menu] Error loading user:', error);
        enqueueMessage(chatId, 'Ошибка загрузки данных. Попробуйте /start.');
        return;
      }
    }
    
    const groupId = session.groupId || 1;
    const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
    console.log('[menu] groupId:', groupId, 'keyboard:', kb);
    const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
    enqueueMessage(chatId, 'Главное меню', options);
  }
};

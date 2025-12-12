const { enqueueMessage } = require('../controllers/botController');

module.exports = {
  processText: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    const session = appState.sessions.get(chatId);
    if (!session) {
      enqueueMessage(chatId, 'Пожалуйста, используйте /start для инициализации сессии.');
      return;
    }
    session.lastActivity = Date.now();
    const text = msg.text;
    const groupId = session?.groupId || session?.context?.groupId || 1;

    // Получаем информацию о роли
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

    // Обработка нажатий кнопок меню
    if (text === 'Главное меню') {
      const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, 'Главное меню', options);
    } else if (text === 'Документы') {
      const kb = appState.keyboards?.get(appState.buttons.menu.documents.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, '📄 Раздел "Документы"', options);
    } else if (text === 'Мой профиль') {
      // Вывод информации о пользователе из сессии
      const firstName = session.firstName || 'Гость';
      const userId = session.userId || chatId;
      enqueueMessage(chatId, `👤 Профиль\nИмя: ${firstName}\nID: ${userId}\nРоль: ${roleName}`);
    } else if (text === 'Назад') {
      // Возврат в главное меню
      const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, 'Главное меню', options);
    } else {
      // Эхо для неизвестных сообщений
      enqueueMessage(chatId, `Эхо: ${text}`);
    }
  },
  processDocument: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    enqueueMessage(chatId, 'Обработка документов пока не реализована.');
  },
  processContact: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    enqueueMessage(chatId, 'Обработка контактов пока не реализована.');
  }
};

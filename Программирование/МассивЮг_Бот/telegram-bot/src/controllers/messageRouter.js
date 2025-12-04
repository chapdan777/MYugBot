const commandHandlers = require('../handlers/commandHandlers');
const callbackHandlers = require('../handlers/callbackHandlers');
const messageHandlers = require('../handlers/messageHandlers');

module.exports = function setupRouter(bot, appState) {
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    if (text.startsWith('/start')) return commandHandlers.start(bot, appState, msg);
    if (text.startsWith('/help')) return commandHandlers.help(bot, appState, msg);
    if (text.startsWith('/menu')) return commandHandlers.menu(bot, appState, msg);
    return messageHandlers.processText(bot, appState, msg);
  });

  bot.on('callback_query', (query) => {
    return callbackHandlers.route(bot, appState, query);
  });
};

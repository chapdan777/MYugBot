const TelegramBot = require('node-telegram-bot-api');
const appState = require('../config/appState');
const { MESSAGE_RATE_LIMIT } = require('../config/constants');

let bot;
let queueTimer;

function initBot(token) {
  bot = new TelegramBot(token, { polling: true });

  // Процессор очереди исходящих сообщений (FIFO)
  if (queueTimer) clearInterval(queueTimer);
  queueTimer = setInterval(() => {
    const item = appState.messageQueue.shift();
    if (!item) return;
    const { chatId, text, options } = item;
    bot.sendMessage(chatId, text, options).catch((err) => {
      // повторная постановка в очередь с ограниченным количеством попыток
      item.retries = (item.retries || 0) + 1;
      if (item.retries <= 3) appState.messageQueue.push(item);
      appState.errorBank.push({
        timestamp: new Date().toISOString(),
        type: 'API',
        severity: 'Medium',
        module: 'botController',
        message: err.message,
        stack: err.stack,
        context: { chatId }
      });
    });
  }, MESSAGE_RATE_LIMIT);

  return bot;
}

function enqueueMessage(chatId, text, options = {}) {
  appState.messageQueue.push({ chatId, text, options, retries: 0 });
}

function getBot() {
  return bot;
}

module.exports = { initBot, enqueueMessage, getBot };

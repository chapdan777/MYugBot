const { enqueueMessage } = require('../controllers/botController');

module.exports = function startNotificationScheduler({ appState }) {
  // Заглушка: обработка уведомлений из очереди, если они есть
  setInterval(() => {
    // TODO: генерировать уведомления на основе бизнес-правил
  }, 5000);
};

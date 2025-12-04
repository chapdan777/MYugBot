const { enqueueMessage } = require('../controllers/botController');

module.exports = {
  notifyAdmin: async (chatId, text) => {
    enqueueMessage(chatId, text);
  }
};

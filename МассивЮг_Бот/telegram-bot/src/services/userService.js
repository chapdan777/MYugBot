const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = {
  // Регистрация гостя через TGP_CREATE_USER
  registerGuest: async ({ userId, firstName, lastName, username, groupId = 1, parentId = null }) => {
    const created = await cubicRepo.createUser({ firstName: firstName || 'Гость', chatId: userId, groupId, lastName, username, parentId });
    return created ? { id: created.ID, chatId: created.CHAT_ID, groupId: created.GROUP_ID, first_name: created.FIRST_NAME, last_name: created.LAST_NAME, username: created.USER_NAME, role: 'Guest' } : null;
  },
  // Поиск пользователя по chatId
  authenticate: async ({ chatId }) => {
    const users = await cubicRepo.loadUsers();
    const found = users.find(u => u.CHAT_ID == chatId);
    return { chatId, authenticated: !!found, user: found || null };
  }
};

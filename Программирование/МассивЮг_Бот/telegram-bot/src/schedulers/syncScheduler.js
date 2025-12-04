const { withCubic } = require('../database/connection');
const qb = require('../database/queryBuilder');
const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = function startSyncScheduler({ intervalSec, appState }) {
  setInterval(async () => {
    const since = appState.lastSyncAt || new Date(0).toISOString();
    try {
      // Загрузка пользователей из БД и обновление кэша
      const users = await cubicRepo.loadUsers();
      if (users && users.length >= 0) {
        appState.users.clear();
        users.forEach(u => {
          appState.users.set(u.ID, u);
        });
      }
      appState.lastSyncAt = new Date().toISOString();
    } catch (err) {
      appState.errorBank.push({
        timestamp: new Date().toISOString(),
        type: 'DB',
        severity: 'High',
        module: 'syncScheduler',
        message: err.message,
        stack: err.stack,
        context: { since }
      });
    }
  }, intervalSec * 1000);
};

// Репозиторий ITM: минимальная обертка для выполнения произвольных запросов
// Комментарии на русском согласно спецификации

const { withITM } = require('../connection');

module.exports = {
  // Универсальный вызов SQL с параметрами
  query: async (sql, params = []) => {
    return withITM(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  }
};

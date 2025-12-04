module.exports = {
  // Заглушка для построения параметризованных запросов
  selectUsersDelta: (sinceTs) => ({
    sql: 'SELECT * FROM USERS WHERE UPDATED_AT > ?',
    params: [sinceTs]
  })
};

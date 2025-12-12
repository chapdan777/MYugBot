require('dotenv').config();
const Firebird = require('node-firebird');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3050,
  database: process.env.DB_NAME || '/firebird/data/ITM_DB.FDB',
  user: process.env.DB_USER || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
  lowercase_keys: false,
  charset: 'UTF8',
};

console.log('Подключение к базе данных:', config);

Firebird.attach(config, (err, db) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err);
    process.exit(1);
  }

  console.log('✅ Подключение установлено');

  // Проверим баланс кассы
  console.log('\n--- Проверка баланса кассы ---');
  db.query('SELECT AMOUNT FROM GET_BALANSE_CASSA', [], (err, result) => {
    if (err) {
      console.error('❌ Ошибка получения баланса:', err);
    } else {
      console.log('Баланс кассы:', result);
    }

    // Проверим журнал кассовых операций за сегодня
    console.log('\n--- Проверка журнала кассовых операций ---');
    const today = new Date().toISOString().split('T')[0];
    db.query(`
      SELECT * FROM JOURNAL_CASHFLOW J 
      WHERE J.category != '#СВЕРКА#' 
        AND J.fact_date = '${today}' 
      ORDER BY J.ID DESC
    `, [], (err, result) => {
      if (err) {
        console.error('❌ Ошибка получения журнала:', err);
      } else {
        console.log(`Найдено ${result.length} записей за сегодня:`);
        console.log(result.slice(0, 3)); // Покажем первые 3 записи
      }

      db.detach();
      process.exit(0);
    });
  });
});
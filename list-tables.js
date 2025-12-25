const Firebird = require('node-firebird');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3050', 10),
  database: process.env.DB_NAME || 'ITM',
  user: process.env.DB_USER || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
};

console.log('Подключение к базе данных:', config);

Firebird.attach(config, (err, db) => {
  if (err) {
    console.error('Ошибка подключения:', err);
    process.exit(1);
  }

  console.log('✅ Подключено к базе данных\n');

  // Получаем список всех таблиц
  const query = `
    SELECT RDB$RELATION_NAME
    FROM RDB$RELATIONS
    WHERE RDB$VIEW_BLR IS NULL 
      AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
    ORDER BY RDB$RELATION_NAME
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      db.detach();
      process.exit(1);
    }

    console.log('Список таблиц в базе данных:');
    console.log('═'.repeat(50));
    result.forEach((table, index) => {
      const tableName = table.RDB$RELATION_NAME ? table.RDB$RELATION_NAME.trim() : '';
      console.log(`${(index + 1).toString().padStart(3)}. ${tableName}`);
    });
    console.log('═'.repeat(50));
    console.log(`Всего таблиц: ${result.length}`);

    db.detach();
    process.exit(0);
  });
});

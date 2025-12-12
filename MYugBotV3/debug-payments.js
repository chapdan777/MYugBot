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

  // 1. Проверим баланс кассы
  console.log('\n--- 1. Проверка баланса кассы ---');
  db.query('SELECT AMOUNT FROM GET_BALANSE_CASSA', [], (err, result) => {
    if (err) {
      console.error('❌ Ошибка получения баланса:', err);
    } else {
      console.log('Баланс кассы:', result);
    }

    // 2. Проверим структуру таблицы JOURNAL_CASHFLOW
    console.log('\n--- 2. Структура таблицы JOURNAL_CASHFLOW ---');
    db.query('SELECT FIRST 1 * FROM JOURNAL_CASHFLOW', [], (err, result) => {
      if (err) {
        console.error('❌ Ошибка получения структуры:', err);
      } else {
        console.log('Структура таблицы:');
        if (result.length > 0) {
          Object.keys(result[0]).forEach(key => {
            console.log(`  ${key}: ${typeof result[0][key]} = ${result[0][key]}`);
          });
        }
      }

      // 3. Проверим наличие записей за последние 30 дней
      console.log('\n--- 3. Проверка записей за последние 30 дней ---');
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 30);
      
      console.log('Сегодня:', today.toISOString().split('T')[0]);
      console.log('Месяц назад:', monthAgo.toISOString().split('T')[0]);
      
      db.query(`
        SELECT COUNT(*) as CNT FROM JOURNAL_CASHFLOW J 
        WHERE J.category != '#СВЕРКА#' 
          AND J.fact_date >= ?
          AND J.fact_date <= ?
      `, [monthAgo, today], (err, result) => {
        if (err) {
          console.error('❌ Ошибка подсчета записей:', err);
        } else {
          console.log('Количество записей за последние 30 дней:', result);
        }

        // 4. Проверим конкретные записи
        console.log('\n--- 4. Конкретные записи ---');
        db.query(`
          SELECT FIRST 3 ID, FACT_DATE, CATEGORY, PURPOSE, MONEYSUM 
          FROM JOURNAL_CASHFLOW J 
          WHERE J.category != '#СВЕРКА#' 
          ORDER BY J.ID DESC
        `, [], (err, result) => {
          if (err) {
            console.error('❌ Ошибка получения записей:', err);
          } else {
            console.log('Последние 3 записи:');
            console.log(result);
          }

          // 5. Проверим формат даты в запросе
          console.log('\n--- 5. Тест разных форматов дат ---');
          const testDate = new Date();
          testDate.setDate(testDate.getDate() - 5); // 5 дней назад
          
          const formats = [
            testDate.toISOString().split('T')[0], // YYYY-MM-DD
            testDate.toISOString(), // ISO полный
            testDate.toLocaleDateString('ru-RU'), // RU формат
          ];
          
          let formatIndex = 0;
          const testFormat = () => {
            if (formatIndex >= formats.length) {
              db.detach();
              process.exit(0);
              return;
            }
            
            const format = formats[formatIndex];
            console.log(`\nТест формата: ${format}`);
            
            db.query(`
              SELECT COUNT(*) as CNT FROM JOURNAL_CASHFLOW J 
              WHERE J.category != '#СВЕРКА#' 
                AND J.fact_date >= ?
                AND J.fact_date <= ?
            `, [format, format], (err, result) => {
              if (err) {
                console.error(`Ошибка с форматом ${format}:`, err.message);
              } else {
                console.log(`Результат для ${format}:`, result[0].CNT);
              }
              
              formatIndex++;
              testFormat();
            });
          };
          
          testFormat();
        });
      });
    });
  });
});
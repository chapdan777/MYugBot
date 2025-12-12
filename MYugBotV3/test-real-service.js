// Тестирование реального PaymentsService
require('dotenv').config();

// Имитируем необходимые зависимости для тестирования
const Firebird = require('node-firebird');

// Создаем упрощенную версию DatabaseService
class TestDatabaseService {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3050,
      database: process.env.DB_NAME || '/firebird/data/ITM_DB.FDB',
      user: process.env.DB_USER || 'SYSDBA',
      password: process.env.DB_PASSWORD || 'masterkey',
    };
  }

  async query(query, params = []) {
    console.log('Выполняем запрос:', query);
    console.log('Параметры:', params);
    
    return new Promise((resolve, reject) => {
      Firebird.attach(this.config, (err, db) => {
        if (err) {
          console.error('Ошибка подключения:', err);
          return reject(err);
        }

        db.query(query, params, (err, result) => {
          db.detach();
          if (err) {
            console.error('Ошибка выполнения запроса:', err);
            return reject(err);
          }
          console.log('Результат запроса:', result.length, 'записей');
          resolve(result);
        });
      });
    });
  }
}

// Имитируем PaymentsRepository
class TestPaymentsRepository {
  constructor() {
    this.dbService = new TestDatabaseService();
  }

  async getCashboxBalance() {
    const query = `SELECT AMOUNT FROM GET_BALANSE_CASSA`;
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  async getCashFlowByDate(date) {
    const queryObj = {
      query: `
        SELECT * 
        FROM JOURNAL_CASHFLOW J 
        WHERE J.category != '#СВЕРКА#' 
          AND CAST(J.fact_date AS DATE) = CAST(? AS DATE)
        ORDER BY J.ID DESC
      `,
      params: [date]
    };
    return await this.dbService.query(queryObj.query, queryObj.params);
  }

  async getCashFlowLastSevenDays(startDate, endDate) {
    const queryObj = {
      query: `
        SELECT * 
        FROM JOURNAL_CASHFLOW J 
        WHERE J.category != '#СВЕРКА#' 
          AND CAST(J.fact_date AS DATE) >= CAST(? AS DATE)
          AND CAST(J.fact_date AS DATE) <= CAST(? AS DATE)
        ORDER BY J.ID DESC
      `,
      params: [startDate, endDate]
    };
    return await this.dbService.query(queryObj.query, queryObj.params);
  }
}

// Имитируем PaymentsService
class TestPaymentsService {
  constructor() {
    this.paymentsRepository = new TestPaymentsRepository();
  }

  async getCashboxBalance() {
    console.log('Получаем баланс кассы...');
    const result = await this.paymentsRepository.getCashboxBalance();
    console.log('Результат баланса:', result);
    return result?.amount || 0;
  }

  async getCashFlowLastSevenDays() {
    console.log('Получаем журнал за последние 7 дней...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Преобразуем даты в строковый формат YYYY-MM-DD для корректной работы с Firebird
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    console.log('Даты:', formatDate(startDate), 'до', formatDate(endDate));
    return await this.paymentsRepository.getCashFlowLastSevenDays(
      formatDate(startDate),
      formatDate(endDate),
    );
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }
}

// Тестирование
async function testRealService() {
  console.log('=== Тестирование реального PaymentsService ===\n');
  
  const service = new TestPaymentsService();
  
  try {
    // Тест баланса кассы
    console.log('--- Баланс кассы ---');
    const balance = await service.getCashboxBalance();
    console.log(`Баланс: ${balance}\n`);
    
    // Тест журнала за последние 7 дней
    console.log('--- Журнал за последние 7 дней ---');
    const entries = await service.getCashFlowLastSevenDays();
    console.log(`Найдено записей: ${entries.length}`);
    console.log('Первые 3 записи:', entries.slice(0, 3));
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

// Запуск теста
testRealService();
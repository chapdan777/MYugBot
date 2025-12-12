// Тестирование PaymentsService
require('dotenv').config();

// Имитируем необходимые зависимости
const Firebird = require('node-firebird');

// Создаем упрощенную версию DatabaseService
class MockDatabaseService {
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
          resolve(result);
        });
      });
    });
  }
}

// Имитируем PaymentsQueries
const PaymentsQueries = {
  getCashboxBalance: () => `
    SELECT AMOUNT 
    FROM GET_BALANSE_CASSA
  `,

  getCashFlowByDate: (date) => ({
    query: `
      SELECT * 
      FROM JOURNAL_CASHFLOW J 
      WHERE J.category != '#СВЕРКА#' 
        AND CAST(J.fact_date AS DATE) = CAST(? AS DATE)
      ORDER BY J.ID DESC
    `,
    params: [date]
  }),

  getCashFlowLastSevenDays: (startDate, endDate) => ({
    query: `
      SELECT * 
      FROM JOURNAL_CASHFLOW J 
      WHERE J.category != '#СВЕРКА#' 
        AND CAST(J.fact_date AS DATE) >= CAST(? AS DATE)
        AND CAST(J.fact_date AS DATE) <= CAST(? AS DATE)
      ORDER BY J.ID DESC
    `,
    params: [startDate, endDate]
  })
};

// Имитируем PaymentsRepository
class MockPaymentsRepository {
  constructor() {
    this.dbService = new MockDatabaseService();
  }

  async getCashboxBalance() {
    const query = PaymentsQueries.getCashboxBalance();
    const result = await this.dbService.query(query);
    return result.length > 0 ? result[0] : null;
  }

  async getCashFlowByDate(date) {
    const queryObj = PaymentsQueries.getCashFlowByDate(date);
    return await this.dbService.query(queryObj.query, queryObj.params);
  }

  async getCashFlowLastSevenDays(startDate, endDate) {
    const queryObj = PaymentsQueries.getCashFlowLastSevenDays(startDate, endDate);
    return await this.dbService.query(queryObj.query, queryObj.params);
  }
}

// Имитируем PaymentsService
class MockPaymentsService {
  constructor() {
    this.paymentsRepository = new MockPaymentsRepository();
  }

  async getCashboxBalance() {
    const result = await this.paymentsRepository.getCashboxBalance();
    return result?.amount || 0;
  }

  async getCashFlowByDate(date) {
    return await this.paymentsRepository.getCashFlowByDate(date);
  }

  async getCashFlowLastSevenDays() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Преобразуем даты в строковый формат YYYY-MM-DD для корректной работы с Firebird
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    return await this.paymentsRepository.getCashFlowLastSevenDays(
      formatDate(startDate),
      formatDate(endDate),
    );
  }

  formatCashFlowForDisplay(entries) {
    if (entries.length === 0) {
      return 'Нет операций за указанный период.';
    }

    let text = `Кассовые операции (${entries.length}):\n\n`;

    let totalIncome = 0;
    let totalExpense = 0;

    entries.forEach((entry, index) => {
      const isIncome = entry.moneysum > 0;
      const icon = isIncome ? '🔹' : '🔻';
      
      // Форматируем дату
      const formatDate = (date) => {
        if (typeof date === 'string') {
          return date.split('T')[0];
        }
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        return String(date);
      };

      text += `${index + 1}. ${icon} ${formatDate(entry.fact_date)}\n`;
      text += `💰 <b>${this.formatMoney(entry.moneysum)}</b>\n`;
      text += `▪️ ${entry.category}; <u>${entry.purpose}</u>\n`;
      if (entry.comment) {
        text += `<i>${entry.comment}</i>\n`;
      }
      text += `${'—'.repeat(16)}\n`;

      if (isIncome) {
        totalIncome += entry.moneysum;
      } else {
        totalExpense += entry.moneysum;
      }
    });

    text += `\n<u>Итого:</u>\n`;
    text += `🔹 Приход: <b>${this.formatMoney(totalIncome)}</b>\n`;
    text += `🔻 Расход: <b>${this.formatMoney(totalExpense)}</b>\n`;

    return text;
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }
}

// Тестирование
async function testPaymentsService() {
  console.log('=== Тестирование PaymentsService ===\n');
  
  const service = new MockPaymentsService();
  
  try {
    // Тест баланса кассы
    console.log('--- Баланс кассы ---');
    const balance = await service.getCashboxBalance();
    console.log(`Баланс: ${balance.toLocaleString('ru-RU')} ₽\n`);
    
    // Тест журнала за последние 7 дней
    console.log('--- Журнал за последние 7 дней ---');
    const entries7days = await service.getCashFlowLastSevenDays();
    console.log(`Найдено записей: ${entries7days.length}`);
    if (entries7days.length > 0) {
      console.log('Форматированный вывод:');
      console.log(service.formatCashFlowForDisplay(entries7days.slice(0, 3))); // Покажем первые 3 записи
    }
    
    // Тест журнала за сегодня
    console.log('--- Журнал за сегодня ---');
    const today = new Date().toISOString().split('T')[0];
    const entriesToday = await service.getCashFlowByDate(today);
    console.log(`Найдено записей за сегодня: ${entriesToday.length}`);
    if (entriesToday.length > 0) {
      console.log('Форматированный вывод:');
      console.log(service.formatCashFlowForDisplay(entriesToday.slice(0, 3))); // Покажем первые 3 записи
    }
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

// Запуск теста
testPaymentsService();
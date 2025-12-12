require('dotenv').config();

const appState = require('./config/appState');
const { SYNC_INTERVAL, MESSAGE_RATE_LIMIT, LOG_LEVEL } = require('./config/constants');
const { initBot } = require('./controllers/botController');
const setupRouter = require('./controllers/messageRouter');
const startSyncScheduler = require('./schedulers/syncScheduler');
const startNotificationScheduler = require('./schedulers/notificationScheduler');

function bootstrap() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[startup] TELEGRAM_BOT_TOKEN is missing');
    process.exit(1);
  }

  // Подключение кнопок и клавиатур из utils
  appState.buttons = require('./utils/buttons');
  appState.keyboards = require('./utils/keyboards');
  const bot = initBot(token, { rateLimitMs: MESSAGE_RATE_LIMIT, logLevel: LOG_LEVEL });
  setupRouter(bot, appState);
  // Планировщики
  startSyncScheduler({ intervalSec: SYNC_INTERVAL, appState });
  startNotificationScheduler({ appState });

  console.log(`[startup] Bot online. Sync interval: ${SYNC_INTERVAL}s, rate limit: ${MESSAGE_RATE_LIMIT}ms`);
}

bootstrap();

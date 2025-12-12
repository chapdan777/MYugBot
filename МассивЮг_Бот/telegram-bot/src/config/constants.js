module.exports = {
  SYNC_INTERVAL: Number(process.env.SYNC_INTERVAL || 120),
  MESSAGE_RATE_LIMIT: Number(process.env.MESSAGE_RATE_LIMIT || 300),
  SESSION_TTL_MS: 30 * 60 * 1000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

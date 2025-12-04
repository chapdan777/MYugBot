const firebird = require('node-firebird');

function getDbConfig(prefix) {
  return {
    host: process.env[`${prefix}_HOST`],
    port: Number(process.env[`${prefix}_PORT`] || 3050),
    database: process.env[`${prefix}_DATABASE`],
    user: process.env[`${prefix}_USER`] || 'SYSDBA',
    password: process.env[`${prefix}_PASSWORD`] || 'masterkey'
  };
}

function attach(config) {
  return new Promise((resolve, reject) => {
    firebird.attach(config, (err, db) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

async function withConnection(prefix, fn) {
  const config = getDbConfig(prefix);
  const db = await attach(config);
  try {
    return await fn(db);
  } finally {
    db.detach();
  }
}

module.exports = {
  withCubic: (fn) => withConnection('CUBIC_DB', fn),
  withITM: (fn) => withConnection('ITM_DB', fn)
};

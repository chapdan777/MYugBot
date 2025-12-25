require('dotenv').config();
const Firebird = require('node-firebird');
const fs = require('fs');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3050,
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
  lowercase_keys: false,
  charset: 'UTF8',
};

console.log('🔧 Import Telegram Users after Migration for MYugBotV3');
console.log('Connecting to:', config.database);
console.log('');

// Подключение к базе данных
Firebird.attach(config, (err, db) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }

  console.log('✅ Connection established\n');

  // Проверяем, существует ли таблица TG_USERS
  db.query("SELECT COUNT(*) as CNT FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0 AND RDB$VIEW_BLR IS NULL AND RDB$RELATION_NAME='TG_USERS'", [], (err, result) => {
    if (err) {
      console.log('❌ Error checking TG_USERS table:', err.message);
      db.detach(() => process.exit(1));
      return;
    }

    if (result[0].CNT === 0) {
      console.log('❌ TG_USERS table does not exist, run migrate.js first');
      db.detach(() => process.exit(1));
      return;
    }

    console.log('✅ TG_USERS table exists');

    // Проверяем, есть ли уже пользователи в таблице
    db.query("SELECT COUNT(*) as CNT FROM tg_users", [], (err, result) => {
      if (err) {
        console.log('❌ Error checking tg_users count:', err.message);
        db.detach(() => process.exit(1));
        return;
      }

      const userCount = result[0].CNT;
      console.log(`📊 Found ${userCount} users in tg_users table`);

      if (userCount > 0) {
        console.log('✅ tg_users table already has data, skipping import.');
        db.detach(() => process.exit(0));
        return;
      }

      // Читаем данные пользователей из JSON файла
      try {
        const usersData = JSON.parse(fs.readFileSync(__dirname + '/telegram-users-seed.json', 'utf8'));
        console.log(`✅ Loaded ${usersData.length} users from seed file`);
        
        importUsers(db, usersData);
      } catch (error) {
        console.log('❌ Error reading telegram-users-seed.json:', error.message);
        db.detach(() => process.exit(1));
        return;
      }
    });
  });
});

function importUsers(db, usersData) {
  let processedCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  function importNext() {
    if (processedCount >= usersData.length) {
      console.log('\n' + '='.repeat(50));
      console.log('📊 Import Results:');
      console.log(`  ✅ Successfully imported: ${usersData.length - errorCount - skipCount}`);
      console.log(`  ⏭️  Already existed: ${skipCount}`);
      console.log(`  ❌ Errors: ${errorCount}`);
      console.log('='.repeat(50));
      
      db.detach(() => process.exit(errorCount > 0 ? 1 : 0));
      return;
    }

    const user = usersData[processedCount];
    processedCount++;

    // Проверяем, существует ли уже пользователь с этим CHAT_ID
    const checkQuery = 'SELECT COUNT(*) as CNT FROM tg_users WHERE chat_id = ?';
    db.query(checkQuery, [user.chat_id], (err, result) => {
      if (err) {
        console.log(`  ❌ Error checking user ${user.chat_id}:`, err.message);
        errorCount++;
        importNext();
        return;
      }

      if (result[0].CNT > 0) {
        console.log(`  ⏭️  User ${user.chat_id} already exists, skipping`);
        skipCount++;
        importNext();
        return;
      }

      // Вставляем пользователя в таблицу tg_users
      const insertQuery = `
        INSERT INTO tg_users (
          chat_id, first_name, last_name, username,
          group_id, parent_id, phonenumber, card, cardowner,
          is_active, is_registered, is_blocked,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        user.chat_id,
        user.first_name.substring(0, 255), // Ограничиваем длину
        user.last_name ? user.last_name.substring(0, 255) : '',   // Ограничиваем длину
        user.username ? user.username.substring(0, 255) : '',
        user.group_id || 1,
        user.parent_id || null,
        user.phonenumber ? user.phonenumber.substring(0, 50) : '',
        user.card ? user.card.substring(0, 50) : '',
        user.cardowner ? user.cardowner.substring(0, 255) : '',
        user.is_active !== undefined ? user.is_active : 1,
        user.is_registered !== undefined ? user.is_registered : 0,
        user.is_blocked !== undefined ? user.is_blocked : 0,
        new Date(user.created_at).toISOString().replace('T', ' ').replace('Z', ''),
        new Date(user.updated_at).toISOString().replace('T', ' ').replace('Z', '')
      ];

      db.query(insertQuery, params, (err) => {
        if (err) {
          console.log(`  ❌ Error inserting user ${user.chat_id}:`, err.message);
          errorCount++;
        } else {
          console.log(`  ✅ User ${user.chat_id} (${user.first_name}) imported successfully`);
        }
        importNext();
      });
    });
  }

  // Начинаем импорт
  console.log('🚀 Starting user import...');
  importNext();
}
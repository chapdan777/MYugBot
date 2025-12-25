require('dotenv').config();
const Firebird = require('node-firebird');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3050,
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
  lowercase_keys: false,
  charset: 'UTF8',
};

console.log('🔧 Database Migration for MYugBotV3');
console.log('Connecting to:', config.database);
console.log('');

// Проверяем, существует ли уже подключение к базе данных
Firebird.attach(config, (err, db) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }

  console.log('✅ Connection established\n');

  // Проверяем, существуют ли уже нужные таблицы/объекты
  db.query("SELECT COUNT(*) as CNT FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0 AND RDB$VIEW_BLR IS NULL AND RDB$RELATION_NAME='TG_USERS'", [], (err, result) => {
    if (err) {
      console.log('❌ Error checking TG_USERS table:', err.message);
      db.detach(() => process.exit(1));
      return;
    }

    if (result[0].CNT > 0) {
      console.log('⏭️  TG_USERS table already exists, skipping migrations\n');
      db.detach(() => {
        console.log('Connection closed');
        process.exit(0);
      });
      return;
    }

    const migrations = [
    {
      name: 'Create TG_USERS table',
      query: `CREATE TABLE TG_USERS (
        ID INTEGER NOT NULL PRIMARY KEY,
        CHAT_ID BIGINT NOT NULL UNIQUE,
        FIRST_NAME VARCHAR(255),
        LAST_NAME VARCHAR(255),
        USERNAME VARCHAR(255),
        GROUP_ID INTEGER DEFAULT 1,
        PARENT_ID INTEGER,
        PHONENUMBER VARCHAR(50),
        CARD VARCHAR(50),
        CARDOWNER VARCHAR(255),
        IS_ACTIVE SMALLINT DEFAULT 1,
        IS_REGISTERED SMALLINT DEFAULT 0,
        IS_BLOCKED SMALLINT DEFAULT 0,
        BILLING_ID INTEGER,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      skipIfExists: true,
    },
    {
      name: 'Create generator GEN_TG_USERS_ID',
      query: `CREATE GENERATOR GEN_TG_USERS_ID`,
      skipIfExists: true,
    },
    {
      name: 'Create trigger TG_USERS_BI',
      query: `CREATE TRIGGER TG_USERS_BI FOR TG_USERS
       ACTIVE BEFORE INSERT POSITION 0
       AS
       BEGIN
         IF (NEW.ID IS NULL) THEN
           NEW.ID = GEN_ID(GEN_TG_USERS_ID, 1);
       END`,
      skipIfExists: true,
    },
    {
      name: 'Create index IDX_TG_USERS_CHAT_ID',
      query: `CREATE INDEX IDX_TG_USERS_CHAT_ID ON TG_USERS(CHAT_ID)`,
      skipIfExists: true,
    },
    {
      name: 'Create index IDX_TG_USERS_USERNAME',
      query: `CREATE INDEX IDX_TG_USERS_USERNAME ON TG_USERS(USERNAME)`,
      skipIfExists: true,
    },
    {
      name: 'Create procedure TGP_CREATE_USER',
      query: `CREATE PROCEDURE TGP_CREATE_USER (
        IN_FIRST_NAME VARCHAR(255),
        IN_CHAT_ID BIGINT,
        IN_GROUP_ID INTEGER,
        IN_LAST_NAME VARCHAR(255),
        IN_USERNAME VARCHAR(255),
        IN_PARENT_ID INTEGER
      )
      RETURNS (
        ID INTEGER,
        CHAT_ID BIGINT,
        GROUP_ID INTEGER,
        FIRST_NAME VARCHAR(255),
        LAST_NAME VARCHAR(255),
        USER_NAME VARCHAR(255),
        IS_REGISTERED SMALLINT,
        IS_BLOCKED SMALLINT,
        BILLING_ID INTEGER,
        PARENT_ID INTEGER
      )
      AS
      BEGIN
        INSERT INTO TG_USERS (
          FIRST_NAME, 
          CHAT_ID, 
          GROUP_ID, 
          LAST_NAME, 
          USERNAME, 
          PARENT_ID,
          IS_REGISTERED,
          IS_BLOCKED
        ) 
        VALUES (
          :IN_FIRST_NAME, 
          :IN_CHAT_ID, 
          COALESCE(:IN_GROUP_ID, 1), 
          :IN_LAST_NAME, 
          :IN_USERNAME, 
          :IN_PARENT_ID,
          0,
          0
        )
        RETURNING 
          ID, CHAT_ID, GROUP_ID, FIRST_NAME, LAST_NAME, 
          USERNAME, IS_REGISTERED, IS_BLOCKED, BILLING_ID, PARENT_ID
        INTO 
          :ID, :CHAT_ID, :GROUP_ID, :FIRST_NAME, :LAST_NAME, 
          :USER_NAME, :IS_REGISTERED, :IS_BLOCKED, :BILLING_ID, :PARENT_ID;
        SUSPEND;
      END`,
      skipIfExists: true,
    },
  ];

  let currentIndex = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  function executeNext() {
    if (currentIndex >= migrations.length) {
      console.log('\n' + '='.repeat(50));
      console.log('📊 Migration Results:');
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ⏭️  Skipped (already exists): ${skipCount}`);
      console.log(`  ❌ Errors: ${errorCount}`);
      console.log('='.repeat(50));
      
      // После выполнения всех миграций проверяем, нужно ли переносить пользователей
      checkAndMigrateUsers();
      return;
    }

    const migration = migrations[currentIndex];
    console.log(`[${currentIndex + 1}/${migrations.length}] ${migration.name}...`);

    db.query(migration.query, [], (err) => {
      if (err) {
        if (migration.skipIfExists &&
            (err.message.includes('already exists') ||
             err.message.includes('attempt to store duplicate'))) {
          console.log(`  ⏭️  Already exists, skipping`);
          skipCount++;
        } else {
          console.log(`  ❌ Error: ${err.message}`);
          errorCount++;
        }
      } else {
        console.log(`  ✅ Success`);
        successCount++;
      }

      currentIndex++;
      executeNext();
    });
  }

 // Функция для проверки и миграции пользователей
  function checkAndMigrateUsers() {
    // Проверяем, есть ли пользователи в таблице tg_users
    db.query("SELECT COUNT(*) as CNT FROM tg_users", [], (err, result) => {
      if (err) {
        console.log('⚠️  Error checking tg_users count:', err.message);
        console.log('Skipping user migration due to error.');
        finalizeConnection();
        return;
      }

      const userCount = result[0].CNT;
      console.log(`\n📊 Found ${userCount} users in tg_users table`);

      if (userCount > 0) {
        console.log('✅ tg_users table already has data, skipping user migration.');
        finalizeConnection();
        return;
      }

      console.log('🔄 No users found in tg_users, starting user migration from ITM DB...');
      
      // Запрос для получения сотрудников из ITM базы данных
      const employeeQuery = `
        SELECT
          FIRST 1000  -- Ограничиваем количество для тестирования
          e.ID as EMPLOYEE_ID,
          e.NAME as EMPLOYEE_NAME,
          e.FULLNAME as EMPLOYEE_FULLNAME,
          e.LOGIN as EMPLOYEE_LOGIN,
          e.EMAIL,
          e.PHONE,
          e.POSITION_,
          e.DEPARTMENT,
          e.TG_ID as TELEGRAM_ID  -- Предполагаем, что в ITM есть поле с Telegram ID
        FROM EMPLOYEE e
        WHERE e.TG_ID IS NOT NULL
        ORDER BY e.ID
      `;

      db.query(employeeQuery, [], (err, employees) => {
        if (err) {
          console.log('⚠️  No EMPLOYEE table found or error querying employees:', err.message);
          
          // Пробуем другую таблицу - возможно, USERS в ITM
          const usersQuery = `
            SELECT
              FIRST 1000
              u.ID as EMPLOYEE_ID,
              u.NAME as EMPLOYEE_NAME,
              u.FULLNAME as EMPLOYEE_FULLNAME,
              u.LOGIN as EMPLOYEE_LOGIN,
              u.EMAIL,
              u.PHONE,
              u.POSITION_,
              u.DEPARTMENT,
              u.TG_ID as TELEGRAM_ID
            FROM USERS u
            WHERE u.TG_ID IS NOT NULL
            ORDER BY u.ID
          `;

          db.query(usersQuery, [], (err2, users) => {
            if (err2) {
              console.log('⚠️  No USERS table found either:', err2.message);
              
              // Пробуем таблицу с именем ITM_USERS или другую возможную структуру
              const itmUsersQuery = `
                SELECT
                  FIRST 1000
                  i.ID as EMPLOYEE_ID,
                  i.NAME as EMPLOYEE_NAME,
                  i.FULLNAME as EMPLOYEE_FULLNAME,
                  i.LOGIN as EMPLOYEE_LOGIN,
                  i.EMAIL,
                  i.PHONE,
                  i.POSITION_,
                  i.DEPARTMENT,
                  i.TG_ID as TELEGRAM_ID
                FROM ITM_USERS i
                WHERE i.TG_ID IS NOT NULL
                ORDER BY i.ID
              `;

              db.query(itmUsersQuery, [], (err3, itmUsers) => {
                if (err3) {
                  console.log('⚠️  No ITM_USERS table found:', err3.message);
                  
                  // Если ни одна из таблиц не найдена, пробуем общий запрос для поиска таблиц с TG_ID
                  const findTgIdTablesQuery = `
                    SELECT DISTINCT r.RDB$RELATION_NAME as TABLE_NAME
                    FROM RDB$RELATION_FIELDS rf
                    JOIN RDB$RELATIONS r ON rf.RDB$RELATION_NAME = r.RDB$RELATION_NAME
                    WHERE rf.RDB$FIELD_NAME LIKE '%TG_ID%'
                      AND r.RDB$SYSTEM_FLAG = 0
                      AND r.RDB$VIEW_BLR IS NULL
                    ORDER BY r.RDB$RELATION_NAME
                  `;

                  db.query(findTgIdTablesQuery, [], (err4, tgIdTables) => {
                    if (err4) {
                      console.log('❌ Error finding tables with TG_ID field:', err4.message);
                      console.log('❌ No suitable employee/users table found in ITM DB');
                      console.log('ℹ️  User migration skipped.');
                      finalizeConnection();
                      return;
                    }

                    if (tgIdTables.length > 0) {
                      console.log('✅ Found tables with TG_ID field:', tgIdTables.map(t => t.TABLE_NAME).join(', '));
                      
                      // Используем первую найденную таблицу
                      const tableName = tgIdTables[0].TABLE_NAME;
                      const dynamicQuery = `
                        SELECT
                          FIRST 1000
                          t.ID as EMPLOYEE_ID,
                          COALESCE(t.NAME, t.FULLNAME, t.LOGIN, t.USERNAME, t.FIRSTNAME || ' ' || t.LASTNAME) as EMPLOYEE_NAME,
                          t.FULLNAME as EMPLOYEE_FULLNAME,
                          t.LOGIN as EMPLOYEE_LOGIN,
                          t.EMAIL,
                          t.PHONE,
                          t.POSITION_,
                          t.DEPARTMENT,
                          t.TG_ID as TELEGRAM_ID
                        FROM ${tableName} t
                        WHERE t.TG_ID IS NOT NULL
                        ORDER BY t.ID
                      `;

                      db.query(dynamicQuery, [], (err5, dynamicUsers) => {
                        if (err5) {
                          console.log('❌ Error querying found table:', err5.message);
                          console.log('ℹ️  User migration skipped.');
                          finalizeConnection();
                          return;
                        }

                        processUsers(dynamicUsers);
                      });
                    } else {
                      console.log('❌ No tables with TG_ID field found in ITM DB');
                      console.log('ℹ️  Looking for tables that might contain employee/user data...');
                      
                      // Ищем все возможные таблицы, которые могут содержать пользовательские данные
                      const findAllUserTablesQuery = `
                        SELECT DISTINCT r.RDB$RELATION_NAME as TABLE_NAME
                        FROM RDB$RELATION_FIELDS rf
                        JOIN RDB$RELATIONS r ON rf.RDB$RELATION_NAME = r.RDB$RELATION_NAME
                        WHERE (UPPER(rf.RDB$FIELD_NAME) LIKE '%USER%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%EMPLOYEE%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%NAME%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%LOGIN%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%EMAIL%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%PHONE%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%TELEGRAM%'
                               OR UPPER(rf.RDB$FIELD_NAME) LIKE '%TG%')
                          AND r.RDB$SYSTEM_FLAG = 0
                          AND r.RDB$VIEW_BLR IS NULL
                        ORDER BY r.RDB$RELATION_NAME
                      `;

                      db.query(findAllUserTablesQuery, [], (err6, userTables) => {
                        if (err6) {
                          console.log('❌ Error finding potential user tables:', err6.message);
                          console.log('ℹ️  User migration skipped.');
                          finalizeConnection();
                          return;
                        }

                        if (userTables.length > 0) {
                          console.log('✅ Found potential user/employee tables:', userTables.map(t => t.TABLE_NAME).join(', '));
                          console.log('❌ Automatic migration not possible - need manual configuration');
                          console.log('ℹ️  User migration skipped.');
                        } else {
                          console.log('❌ No potential user/employee tables found');
                        }
                        
                        finalizeConnection();
                        return;
                      });
                    }
                  });
                } else {
                  processUsers(itmUsers);
                }
              });
            } else {
              processUsers(users);
            }
          });
        } else {
          processUsers(employees);
        }
      });
    });
  }

  // Функция для обработки пользователей
  function processUsers(users) {
    if (!users || users.length === 0) {
      console.log('ℹ️  No users found with Telegram IDs in ITM DB');
      finalizeConnection();
      return;
    }

    console.log(`✅ Found ${users.length} users with Telegram IDs in ITM DB`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Функция для обработки следующего пользователя
    function processNext() {
      if (processedCount >= users.length) {
        console.log('\n📊 User Migration Results:');
        console.log(`  ✅ Successfully processed: ${users.length - skippedCount - errorCount}`);
        console.log(` ⏭️  Already existed: ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log('='.repeat(50));
        
        finalizeConnection();
        return;
      }

      const user = users[processedCount];
      processedCount++;

      // Проверяем, существует ли уже пользователь с этим Telegram ID в tg_users
      const checkQuery = 'SELECT COUNT(*) as CNT FROM tg_users WHERE chat_id = ?';
      db.query(checkQuery, [user.TELEGRAM_ID], (err, result) => {
        if (err) {
          console.log(`  ❌ Error checking user ${user.TELEGRAM_ID}:`, err.message);
          errorCount++;
          processNext();
          return;
        }

        if (result[0].CNT > 0) {
          console.log(`  ⏭️  User ${user.TELEGRAM_ID} already exists, skipping`);
          skippedCount++;
          processNext();
          return;
        }

        // Извлекаем имя пользователя
        let firstName = '';
        let lastName = '';
        
        if (user.EMPLOYEE_FULLNAME) {
          const nameParts = user.EMPLOYEE_FULLNAME.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        } else if (user.EMPLOYEE_NAME) {
          firstName = user.EMPLOYEE_NAME;
        } else if (user.EMPLOYEE_LOGIN) {
          firstName = user.EMPLOYEE_LOGIN;
        }

        // Вставляем пользователя в таблицу tg_users
        const insertQuery = `
          INSERT INTO tg_users (
            chat_id, first_name, last_name, username,
            group_id, parent_id, phonenumber,
            is_active, is_registered, is_blocked,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, 1, NULL, ?, 1, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        const params = [
          user.TELEGRAM_ID,
          firstName.substring(0, 255),  // Ограничиваем длину
          lastName.substring(0, 255),   // Ограничиваем длину
          (user.EMPLOYEE_LOGIN || '').substring(0, 255),
          (user.PHONE || '').substring(0, 50)
        ];

        db.query(insertQuery, params, (err) => {
          if (err) {
            console.log(`  ❌ Error inserting user ${user.TELEGRAM_ID}:`, err.message);
            errorCount++;
          } else {
            console.log(`  ✅ User ${user.TELEGRAM_ID} (${firstName}) migrated successfully`);
          }
          processNext();
        });
      });
    }

    // Начинаем обработку
    processNext();
  }

  // Функция для завершения соединения
  function finalizeConnection() {
    db.detach(() => {
      console.log('\nConnection closed');
      process.exit(errorCount > 0 ? 1 : 0);
    });
  }

  executeNext();
});
});

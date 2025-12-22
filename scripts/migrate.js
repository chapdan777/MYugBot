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
  db.query("SELECT COUNT(*) as COUNT FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0 AND RDB$VIEW_BLR IS NULL AND RDB$RELATION_NAME='TG_USERS'", [], (err, result) => {
    if (err) {
      console.log('❌ Error checking TG_USERS table:', err.message);
      db.detach(() => process.exit(1));
      return;
    }

    if (result[0].COUNT > 0) {
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
      
      db.detach(() => {
        console.log('\nConnection closed');
        process.exit(errorCount > 0 ? 1 : 0);
      });
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

  executeNext();
});
});

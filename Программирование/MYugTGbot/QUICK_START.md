# 🚀 Быстрый старт

## ✅ Что уже готово

Создана базовая архитектура проекта на **NestJS + Telegraf + TypeScript**:

### Структура проекта
```
MYugTGbot/
├── src/
│   ├── bot/
│   │   └── bot.module.ts           ✅ Модуль для Telegram бота
│   ├── database/
│   │   ├── database.module.ts      ✅ Модуль БД (Global)
│   │   └── firebird.service.ts     ✅ Сервис для работы с Firebird
│   ├── modules/
│   │   ├── users/
│   │   │   ├── users.module.ts     ✅ Модуль пользователей
│   │   │   ├── users.service.ts    ✅ Бизнес-логика
│   │   │   └── users.repository.ts ✅ Работа с БД
│   │   └── documents/
│   │       └── documents.module.ts ✅ Модуль документов
│   ├── app.module.ts               ✅ Главный модуль
│   └── main.ts                     ✅ Точка входа
├── .env.example                    ✅ Пример конфигурации
├── .gitignore                      ✅ Git ignore
├── README.md                       ✅ Документация
├── PROJECT_STATUS.md               ✅ Статус проекта
└── package.json                    ✅ Зависимости
```

### Ключевые возможности
- ✅ Подключение к 2 базам Firebird (ITM и CUBIC)
- ✅ Репозиторий для пользователей с запросами из flows.json
- ✅ Сервис для автоматической регистрации пользователей
- ✅ Модульная архитектура с Dependency Injection
- ✅ TypeScript с валидацией
- ✅ Проект компилируется без ошибок!

## 📋 Следующие шаги

### 1. Настройка окружения

```bash
# Создать .env файл
cp .env.example .env

# Отредактировать .env и указать:
nano .env
```

Нужно заполнить:
```env
TELEGRAM_BOT_TOKEN=your_token_from_@BotFather

# ITM Database
ITM_DB_HOST=localhost
ITM_DB_PORT=3050
ITM_DB_DATABASE=/path/to/ITM.fdb
ITM_DB_USER=SYSDBA
ITM_DB_PASSWORD=masterkey

# CUBIC Database  
CUBIC_DB_HOST=localhost
CUBIC_DB_PORT=3050
CUBIC_DB_DATABASE=/path/to/CUBIC.FDB
CUBIC_DB_USER=SYSDBA
CUBIC_DB_PASSWORD=masterkey
```

### 2. Запуск проекта

```bash
# Development mode с hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## 🎯 Что делать дальше

### Вариант 1: Продолжить разработку с Telegram handlers

Создать обработчики для бота:

```typescript
// src/bot/updates/start.update.ts
import { Update, Ctx, Start } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../../modules/users/users.service';

@Update()
export class StartUpdate {
  constructor(private readonly usersService: UsersService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const user = await this.usersService.findOrCreate(ctx.from);
    
    await ctx.reply(
      `Привет, ${user.FIRST_NAME}!\\n\\nГлавное меню:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Мои документы', callback_data: 'docs_my' }],
            [{ text: '📊 Все документы', callback_data: 'docs_all' }],
            [{ text: '👥 Пользователи', callback_data: 'users' }],
          ],
        },
      },
    );
  }
}
```

Зарегистрировать в `bot.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from '../modules/users/users.module';
import { StartUpdate } from './updates/start.update';

@Module({
  imports: [UsersModule],
  providers: [StartUpdate],
})
export class BotModule {}
```

### Вариант 2: Доработать Documents Module

Создать репозиторий и сервис для документов по аналогии с Users:

```typescript
// src/modules/documents/documents.repository.ts
async loadDocuments() {
  const query = `
    SELECT * FROM TG_DOCUMENTS d
    WHERE d.isdeleted IS NULL OR d.isdeleted = 0
    ORDER BY id
  `;
  return this.db.executeQuery('cubic', query);
}

async createDocument(authorId: number, name?: string, commentary?: string) {
  const query = `
    SELECT ID FROM TGP_CREATE_DOCUMENT(?, ?, ?)
  `;
  return this.db.executeQuery('cubic', query, [authorId, name, commentary]);
}
```

### Вариант 3: Создать Scenes (Wizards)

Для многошаговых операций (создание документа с этапами):

```bash
npm install telegraf@^4.12.0
```

```typescript
// src/bot/scenes/create-document.scene.ts
import { Scene, SceneEnter, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Scene('create_document')
export class CreateDocumentScene {
  @SceneEnter()
  async onEnter(@Ctx() ctx: Context) {
    await ctx.reply('Введи комментарий к документу или /skip для пропуска:');
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const commentary = ctx.message.text;
    
    if (commentary === '/skip') {
      // Сохранить без комментария
    } else {
      // Сохранить с комментарием
      ctx.session.commentary = commentary;
    }
    
    // Перейти к выбору типа этапа
    await ctx.reply('Выбери тип этапа:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Аванс', callback_data: 'stage_prepaid' }],
          [{ text: 'Закупка', callback_data: 'stage_purchase' }],
          [{ text: 'Производство', callback_data: 'stage_production' }],
        ],
      },
    });
  }
}
```

## 💡 Полезные команды

```bash
# Проверка компиляции
npm run build

# Линтинг
npm run lint

# Форматирование кода
npm run format

# Запуск в dev режиме
npm run start:dev
```

## 📚 Документация

- [NestJS](https://docs.nestjs.com/)
- [Telegraf](https://telegraf.js.org/)
- [nestjs-telegraf](https://github.com/bukhalo/nestjs-telegraf)

## ❓ Частые вопросы

### Как добавить новый обработчик команды?

1. Создать файл в `src/bot/updates/`
2. Использовать декораторы `@Update()`, `@Command()`, `@Action()`
3. Зарегистрировать в `bot.module.ts`

### Как работать с базой данных?

```typescript
// Инъекция FirebirdService
constructor(private readonly db: FirebirdService) {}

// Выполнение запроса
const result = await this.db.executeQuery('cubic', 'SELECT * FROM tg_users');

// Вызов процедуры
const result = await this.db.executeProcedure('cubic', 'TGP_CREATE_USER', [params]);
```

### Где хранятся запросы из flows.json?

Все SQL запросы из Node-RED flows.json нужно перенести в соответствующие репозитории:
- `users.repository.ts` - запросы к tg_users
- `documents.repository.ts` - запросы к tg_documents
- `stages.repository.ts` - запросы к tg_stages

---

**Готово к разработке!** 🚀  
Проект скомпилирован и готов к запуску.

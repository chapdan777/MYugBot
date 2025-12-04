# Статус проекта МассивЮг Telegram Bot

## ✅ Что сделано

### 1. Инициализация проекта
- ✅ Создан NestJS проект с TypeScript
- ✅ Установлены зависимости: `nestjs-telegraf`, `telegraf`, `dotenv`, `node-firebird`
- ✅ Настроена валидация через `class-validator` и `class-transformer`
- ✅ Создан `.env.example` с примерами конфигурации

### 2. Архитектура
- ✅ Модульная структура проекта
- ✅ DatabaseModule для работы с Firebird (ITM и CUBIC)
- ✅ FirebirdService с методами:
  - `executeQuery()` - выполнение SQL запросов
  - `executeProcedure()` - вызов хранимых процедур
- ✅ Подготовлена структура для модулей Users, Documents, Stages

### 3. Конфигурация
- ✅ `.gitignore` настроен правильно
- ✅ README.md с документацией
- ✅ TypeScript конфигурация

## 🔄 Что нужно доделать

### Приоритет 1: Базовые модули

#### UsersModule
Файлы для создания:
```typescript
// src/modules/users/entities/user.entity.ts
export interface User {
  id: number;
  chatId: number;
  groupId: number;
  parentId?: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  card?: string;
  cardOwner?: string;
  isRegistered: boolean;
  isBlocked: boolean;
  billingAccountId?: number;
}

// src/modules/users/users.repository.ts
- loadUsers() - загрузка всех пользователей из БД
- getUserByChatId(chatId) - поиск по Telegram ID
- createUser(userData) - создание пользователя
- updateUser(id, userData) - обновление
- getUsersByGroupId(groupId) - фильтр по группе

// src/modules/users/users.service.ts  
- Бизнес-логика для пользователей
- Проверка прав доступа по ролям
```

#### DocumentsModule
```typescript
// src/modules/documents/documents.repository.ts
Использовать запросы из flows.json:
- loadDocuments() 
- createDocument(authorId, name, commentary)
- getDocumentById(id)
- updateDocument(id, data)
- deleteDocument(id)
- markForDeletion(id)

// src/modules/documents/entities/document.entity.ts
- id, statusId, authorId
- documentName, commentary
- dateCreation, markedForDeletion
```

#### StagesModule & ElementsModule
Аналогично Documents

### Приоритет 2: Telegram Bot Handlers

```typescript
// src/bot/bot.module.ts
@Module({
  imports: [UsersModule, DocumentsModule],
  providers: [
    BotUpdate,          // Основные обработчики
    StartCommand,       // /start
    DocumentsScene,     // Wizard для создания документов
    ...
  ]
})

// src/bot/updates/start.command.ts
@Update()
export class StartCommand {
  @Start()
  async onStart(@Ctx() ctx) {
    const user = await this.usersService.findOrCreate(ctx.from);
    // Показ главного меню с inline-кнопками
  }
}

// src/bot/keyboards/main.keyboard.ts  
export const mainKeyboard = (userRole) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Мои документы', 'docs_my')],
    [Markup.button.callback('📊 Все документы', 'docs_all')],
    [Markup.button.callback('👥 Пользователи', 'users_list')],
  ]);
};
```

### Приоритет 3: Scenes (Wizards)

```typescript
// src/bot/scenes/create-document.scene.ts
@Scene('create_document')
export class CreateDocumentScene {
  @SceneEnter()
  async onEnter(@Ctx() ctx) {
    await ctx.reply('Введи комментарий к документу или /skip');
  }

  @On('text')
  async onText(@Ctx() ctx) {
    // Сохранение комментария
    // Переход к выбору типа этапа
  }
}
```

## 📋 Пошаговый план доделки

### Шаг 1: Завершить Users Module (1-2 часа)
1. Создать `user.entity.ts`
2. Создать `users.repository.ts` с запросами из flows.json
3. Создать `users.service.ts`
4. Добавить DTOs для валидации

### Шаг 2: Bot Module (2-3 часа)
1. Создать `bot.module.ts`
2. Создать `start.command.ts` - обработчик /start
3. Создать `main.keyboard.ts` - главное меню
4. Создать базовые callback handlers

### Шаг 3: Documents Module (2-3 часа)
1. Перенести все запросы из flows.json в repository
2. Создать сервисы
3. Подключить к bot handlers

### Шаг 4: Scenes для создания документов (3-4 часа)
1. Create Document Wizard
2. Create Stage Wizard
3. Payment Wizard

### Шаг 5: Тестирование и доработка (2-3 часа)

## 🔗 Ключевые запросы из flows.json для переноса

```sql
-- Загрузка пользователей
SELECT * FROM tg_users

-- Создание пользователя
SELECT * FROM TGP_CREATE_USER(firstName, chatId, groupId, ...)

-- Загрузка документов
SELECT * FROM TG_DOCUMENTS d 
WHERE d.isdeleted IS NULL OR d.isdeleted = 0

-- Создание документа  
SELECT ID FROM TGP_CREATE_DOCUMENT(authorId, documentName, commentary)

-- Создание этапа
SELECT ID FROM TGP_CREATE_STAGE(documentId, authorId, stageName, materialId, ...)

-- Создание элемента
SELECT * FROM TGP_CREATE_ELEMET(stageId, authorId, typeElementId, ...)
```

## 💡 Рекомендации

1. **Начать с Users Module** - это основа всей системы
2. **Использовать Inline-кнопки** везде - современнее и удобнее
3. **Декомпозировать на Scenes** - каждый многошаговый процесс = отдельный Scene
4. **Переиспользовать SQL из flows.json** - они уже проверены и работают

## 🎯 Текущая задача

**СЛЕДУЮЩИЙ ШАГ:** Создать Users Module полностью (entity + repository + service)

Хочешь, чтобы я продолжил и создал эти файлы?

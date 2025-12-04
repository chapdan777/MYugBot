# План миграции и упрощения проекта

## ✅ Выполненные изменения

### 1. Упрощена база данных
- ❌ Удалена база CUBIC - все запросы теперь идут только к ITM
- ✅ Обновлен `firebird.service.ts` - убраны ссылки на CUBIC
- ✅ Обновлен `.env.example` - убраны настройки CUBIC
- ✅ Обновлен `users.repository.ts` - запросы без указания БД

### 2. Удалены ненужные модули
- ❌ DocumentsModule - полностью убран из app.module.ts
- ❌ BotModule - временно отключен (будет создан заново)
- ✅ Проект компилируется без ошибок

### 3. Созданы документы
- ✅ `simplified-requirements.md` - описание упрощенной структуры
- ✅ `README-NEW.md` - обновленная документация
- ✅ `MIGRATION-PLAN.md` - этот файл с планом работ

## 🔨 Что нужно сделать далее

### Фаза 1: Очистка кода (Priority: HIGH)

#### 1.1 Удалить файлы модуля Documents
```bash
rm -rf src/modules/documents/
```

#### 1.2 Удалить файлы модуля Bot (старые)
```bash
rm -rf src/bot/
```

#### 1.3 Проверить и удалить все импорты DocumentsModule
- Проверить все файлы на упоминания DocumentsModule
- Удалить все неиспользуемые импорты

### Фаза 2: Создание новых модулей (Priority: HIGH)

#### 2.1 Создать модуль Orders
```typescript
// src/modules/orders/orders.module.ts
// src/modules/orders/orders.service.ts
// src/modules/orders/orders.repository.ts
```

**Функциональность**:
- Получение заказов из таблицы ORDERS (ITM)
- Поиск заказов (по ID, клиенту, дате, материалу)
- Фильтры (упакованные, мои заказы, с долгом)
- Детальная информация о заказе

#### 2.2 Создать модуль Shipments
```typescript
// src/modules/shipments/shipments.module.ts
// src/modules/shipments/shipments.service.ts
// src/modules/shipments/shipments.repository.ts
```

**Функциональность**:
- Отгрузки профиля (из JOURNAL_OUT + ORDERS)
- Отгрузки фасадов
- История отгрузок
- Группировка по дате/водителю

#### 2.3 Создать модуль Cash
```typescript
// src/modules/cash/cash.module.ts
// src/modules/cash/cash.service.ts
// src/modules/cash/cash.repository.ts
```

**Функциональность**:
- Просмотр кассовых операций (JOURNAL_CASHFLOW)
- Баланс кассы (GET_BALANSE_CASSA)
- Фильтры по дате (сегодня, неделя, месяц)
- Категории расходов
- Добавление записей (опционально)

### Фаза 3: Создание Bot handlers (Priority: HIGH)

#### 3.1 Создать BotModule
```typescript
// src/bot/bot.module.ts
```

#### 3.2 Создать Inline Keyboards
```typescript
// src/bot/keyboards/main.keyboard.ts
// src/bot/keyboards/orders.keyboard.ts
// src/bot/keyboards/cash.keyboard.ts
```

**Структура кнопок**:
```
Главное меню:
├── 👥 Пользователи (только админы)
├── 📦 Заказы
│   ├── 🔍 Поиск
│   ├── 📦 Упакованные
│   ├── 📋 Мои заказы
│   └── ❗️ С долгом
├── 🚚 Отгрузки
│   ├── 📊 Профиль
│   └── 📊 Фасады
├── 💰 Капуста (баланс)
├── 📊 Журнал расходов
│   ├── 📅 Сегодня
│   ├── 📅 Неделя
│   └── 📅 Месяц
└── 👤 Мой профиль
```

#### 3.3 Создать Update handlers
```typescript
// src/bot/updates/start.update.ts
// src/bot/updates/orders.update.ts
// src/bot/updates/cash.update.ts
```

### Фаза 4: Интеграция с flows.json (Priority: MEDIUM)

#### 4.1 Извлечь SQL запросы из flows.json

**Orders запросы** (из Step 3 в flows.json):
- `queryGetOrder()` - получение заказов с фильтрами
- `queryGetOrderToElement()` - заказы по элементам
- Поиск по тексту, дате, ID

**Cash запросы** (из Step 0 в flows.json):
- `JOURNAL_CASHFLOW` - кассовые операции
- `GET_BALANSE_CASSA` - баланс кассы
- Фильтры по категориям и датам

**Shipments запросы** (из Step 3 в flows.json):
- Отгрузки профиля/фасадов
- Группировка по дате/водителю

#### 4.2 Портировать логику обработки

**Из flows.json нужно взять**:
1. Форматирование сообщений (`formatMessage`, `formatMonetary`, `formatDate`)
2. Логику поиска заказов
3. Генераторы сообщений (`generators.autoAnswer`)
4. Inline keyboard структуры

### Фаза 5: Тестирование (Priority: HIGH)

#### 5.1 Unit тесты
- Тесты для сервисов
- Тесты для репозиториев

#### 5.2 E2E тесты
- Тесты команд бота
- Тесты inline кнопок

#### 5.3 Ручное тестирование
- Проверка всех сценариев
- Проверка прав доступа
- Проверка форматирования

## 📋 Checklist выполнения

### Фаза 1: Очистка
- [ ] Удалить `src/modules/documents/`
- [ ] Удалить старый `src/bot/`
- [ ] Проверить отсутствие импортов DocumentsModule
- [ ] Убедиться что проект компилируется

### Фаза 2: Новые модули
- [ ] Создать Orders module
- [ ] Создать Shipments module
- [ ] Создать Cash module
- [ ] Подключить модули в app.module.ts

### Фаза 3: Bot handlers
- [ ] Создать BotModule
- [ ] Создать inline keyboards
- [ ] Создать update handlers
- [ ] Подключить в app.module.ts

### Фаза 4: Интеграция
- [ ] Портировать SQL запросы
- [ ] Портировать утилиты форматирования
- [ ] Портировать логику поиска

### Фаза 5: Тестирование
- [ ] Написать unit тесты
- [ ] Написать E2E тесты
- [ ] Ручное тестирование
- [ ] Документация

## 🚀 Команды для запуска

### Разработка
```bash
npm run start:dev
```

### Сборка
```bash
npm run build
```

### Тестирование
```bash
npm run test
npm run test:e2e
```

### Проверка кода
```bash
npm run lint
npm run format
```

## 📝 Примечания

### База данных tg_users
В flows.json таблица `tg_users` находится в CUBIC БД. Варианты решения:
1. **Перенести таблицу в ITM** (рекомендуется)
2. Использовать PostgreSQL для хранения пользователей
3. Временно оставить запросы к tg_users (если она есть в обеих БД)

### Inline vs Regular keyboards
В flows.json используются обычные клавиатуры. В новом проекте - **только inline**.  
Преимущества inline:
- Не занимают место в чате
- Можно обновлять сообщения
- Лучший UX
- Callback queries вместо text messages

### Роли пользователей (из flows.json)
```
1 - Гость
2 - Клиент
3 - Агент
4 - Контрагент
5 - Плательщик
6 - Менеджер
7 - Администратор
```

## 🎯 Конечная цель

Получить простой, понятный Telegram бот с:
- ✅ Одной базой данных (ITM)
- ✅ Модульной архитектурой (NestJS)
- ✅ Inline клавиатурами
- ✅ TypeScript + Best Practices
- ✅ Чистым кодом без легаси
- ✅ Полным функционалом из flows.json (Orders, Cash, Shipments)

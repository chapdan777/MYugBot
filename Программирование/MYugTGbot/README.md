# МассивЮг Telegram Bot

Современный Telegram бот на **NestJS + Telegraf + TypeScript** для управления документами, этапами и платежами.

## 🏗️ Архитектура

Проект построен по принципам **Clean Architecture** и **Domain-Driven Design**:

```
src/
├── bot/                    # Telegram bot handlers (Updates, Scenes)
│   ├── updates/           # Command & Action handlers  
│   ├── scenes/            # Conversation flows (Wizards)
│   └── bot.module.ts
├── modules/
│   ├── users/             # User domain
│   │   ├── dto/           # Data Transfer Objects
│   │   ├── entities/      # Domain entities
│   │   ├── users.service.ts
│   │   └── users.repository.ts
│   ├── documents/         # Document domain
│   ├── stages/            # Stage domain
│   └── elements/          # Element domain
├── database/              # Database layer
│   ├── firebird.service.ts
│   └── database.module.ts
├── common/                # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── helpers/
└── main.ts

```

## 🚀 Технологии

- **NestJS** - современный Node.js framework
- **Telegraf** - мощная библиотека для Telegram Bot API
- **TypeScript** - строгая типизация
- **node-firebird** - подключение к Firebird БД (ITM и CUBIC)
- **class-validator** - валидация DTO
- **dotenv** - управление конфигурацией

## 📦 Установка

```bash
# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env

# Настройка переменных окружения
# Отредактируйте .env и укажите:
# - TELEGRAM_BOT_TOKEN
# - Параметры подключения к БД ITM и CUBIC
```

## 🎯 Основные возможности

### ✅ Реализовано
- Модульная архитектура
- Подключение к Firebird (ITM и CUBIC)
- Базовая структура для Users, Documents, Stages
- Dependency Injection
- Глобальная валидация

### 🔄 В процессе
- Telegram bot handlers с inline-кнопками
- Сервисы для работы с документами
- Scenes (Wizards) для многошаговых операций
- Миграция логики из Node-RED flows.json

## 🎮 Запуск

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📝 Структура данных

### Пользователи (TG_USERS)
- Регистрация и авторизация
- Роли и права доступа
- Привязка к billing account

### Документы (TG_DOCUMENTS)
- Создание заказов
- Статусы (В работе / Закрыт)
- Комментарии

### Этапы (TG_STAGES)
- Типы: Аванс, Закупка, Производство, Доставка, Приемка
- Материалы (массивы)
- Даты и комментарии

### Элементы (TG_STAGE_ELEMENTS)
- Количество, цена, сумма
- Отправитель/получатель
- Типы оплаты

## 🔐 Безопасность

- `.env` файл в `.gitignore`
- Валидация всех входящих данных
- Проверка прав доступа по ролям

## 📚 Документация

Для получения деталей работы с Node-RED flows см. `flows (6).json`

---

**Автор:** Миграция с Node-RED на NestJS  
**Версия:** 0.1.0

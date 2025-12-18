# ⚡ Быстрый старт - 3 команды

## 🎯 Рекомендуемый способ: Git

### На исходном ПК (текущий)

```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3

# Автоматическая настройка Git и push
chmod +x deploy-to-git.sh
./deploy-to-git.sh

# Или вручную:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/MYugBotV3.git
git push -u origin main
```

### На целевом ПК

```bash
# 1. Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/MYugBotV3.git
cd MYugBotV3

# 2. Настроить окружение
cp .env.production .env
nano .env  # Укажите TELEGRAM_BOT_TOKEN, DB_HOST, DB_NAME, DB_PASSWORD

# 3. Запустить
docker-compose up -d --build
```

### Обновления (очень просто!)

```bash
docker-compose down
git pull
docker-compose up -d --build
```

---

## 📦 Альтернатива: Архив (без Git)

## На исходном ПК (текущий)

```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3
tar -czf myugbot-v3.tar.gz --exclude=node_modules --exclude=dist --exclude=ITM.FDB --exclude=.git .
# Скопируйте myugbot-v3.tar.gz на целевой ПК
```

## На целевом ПК

```bash
# 1. Распаковать
tar -xzf myugbot-v3.tar.gz && cd MYugBotV3

# 2. Настроить (отредактируйте .env)
cp .env.production .env
nano .env  # Укажите TELEGRAM_BOT_TOKEN, DB_HOST, DB_NAME, DB_PASSWORD

# 3. Запустить
docker-compose up -d --build
```

## Проверка

```bash
# Посмотреть логи
docker-compose logs -f

# Должны увидеть:
# ✅ Пул соединений с ITM DB создан
# ✅ Telegram бот запущен и готов к работе
```

## Минимальная конфигурация .env

```env
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
DB_HOST=localhost                    # или IP сервера БД
DB_PORT=3050
DB_NAME=/path/to/ITM.FDB            # полный путь к БД
DB_USER=SYSDBA
DB_PASSWORD=ваш_пароль
```

## Основные команды

```bash
docker-compose up -d        # Запустить
docker-compose down         # Остановить
docker-compose logs -f      # Логи
docker-compose restart      # Перезапустить
docker-compose ps           # Статус
```

---

**📖 Подробная документация:** [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md)

**⏱️ Время развертывания: ~5-10 минут**

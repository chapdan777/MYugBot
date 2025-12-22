#!/bin/bash
set -e

# Путь к директории проекта на сервере
# Убедитесь, что этот путь соответствует вашему
PROJECT_DIR="/var/www/myug-bot"

echo "=== Deploying MYugBotV3 ==="

# Переходим в директорию проекта
cd $PROJECT_DIR || exit

# Убираем любые локальные изменения, чтобы git pull прошел чисто
git reset --hard HEAD
git clean -fd

# Обновляем код из основной ветки (например, main)
git pull origin main

echo "--- Building and restarting Docker container ---"

# Создаем .env файл, если его нет
if [ ! -f .env ]; then
 cp .env.example .env
  echo "!!! Created .env file from .env.example. Please fill it with your credentials. !!!"
fi

# Пересобираем и перезапускаем контейнер
# --build - пересобрать образ перед запуском
# -d - запустить в фоновом режиме
docker-compose up --build -d

echo "=== Deployment finished successfully! ==="

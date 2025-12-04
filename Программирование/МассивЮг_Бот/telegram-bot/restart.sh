#!/bin/bash

# Остановка всех экземпляров бота
echo "Останавливаем все экземпляры бота..."
pkill -f "node src/index.js"
sleep 2

# Запуск нового экземпляра
echo "Запускаем бот..."
cd "$(dirname "$0")"
node src/index.js

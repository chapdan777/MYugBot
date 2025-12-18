# 🚀 Развертывание через Git (рекомендуемый способ)

## Почему Git лучше архива?

✅ **Версионность** - отслеживание изменений  
✅ **Обновления** - простой `git pull` вместо копирования файлов  
✅ **Откат** - возможность вернуться к предыдущей версии  
✅ **CI/CD** - автоматизация развертывания  
✅ **Команда** - несколько разработчиков могут работать одновременно  

---

## 📋 Вариант 1: Публичный GitHub репозиторий

### Шаг 1: Инициализация Git (на исходном ПК)

```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3

# Инициализировать Git (если еще не сделано)
git init

# Проверить .gitignore
cat .gitignore
```

Убедитесь, что `.gitignore` содержит:
```
node_modules/
dist/
.env
.env.local
*.log
ITM.FDB
coverage/
.DS_Store
```

### Шаг 2: Создать репозиторий на GitHub

1. Зайдите на https://github.com
2. Нажмите **New repository**
3. Название: `MYugBotV3`
4. Сделайте репозиторий **Private** (для безопасности)
5. НЕ инициализируйте с README (у вас уже есть код)

### Шаг 3: Загрузить код на GitHub

```bash
# Добавить все файлы
git add .

# Создать коммит
git commit -m "Initial commit: NestJS Telegram Bot with Docker support"

# Связать с GitHub (замените YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/MYugBotV3.git

# Загрузить код
git branch -M main
git push -u origin main
```

### Шаг 4: Развертывание на целевом ПК

```bash
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/MYugBotV3.git
cd MYugBotV3

# Настроить окружение
cp .env.production .env
nano .env  # Заполните: TELEGRAM_BOT_TOKEN, DB_HOST, DB_NAME, DB_PASSWORD

# Запустить через Docker
docker-compose up -d --build

# Проверить логи
docker-compose logs -f
```

---

## 🔐 Вариант 2: Приватный Git-сервер (локальная сеть)

Если нет доступа к GitHub или нужна полная конфиденциальность:

### На сервере (может быть целевой ПК):

```bash
# Установить Git
sudo apt-get install git  # Debian/Ubuntu
# или
sudo yum install git       # CentOS/RHEL

# Создать bare репозиторий
mkdir -p /var/git/myugbot-v3.git
cd /var/git/myugbot-v3.git
git init --bare
```

### На исходном ПК:

```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3

# Добавить удаленный репозиторий (замените IP)
git remote add production ssh://user@192.168.1.100/var/git/myugbot-v3.git

# Загрузить код
git push production main
```

### На целевом ПК:

```bash
# Клонировать из локального сервера
git clone ssh://user@192.168.1.100/var/git/myugbot-v3.git
cd myugbot-v3

# Настроить и запустить
cp .env.production .env
nano .env
docker-compose up -d --build
```

---

## 🔄 Вариант 3: Git Bundle (без сервера)

Для полностью offline развертывания:

### На исходном ПК:

```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3

# Создать bundle
git bundle create myugbot-v3.bundle --all

# Теперь можно скопировать myugbot-v3.bundle на целевой ПК
# (через USB, сеть, email и т.д.)
```

### На целевом ПК:

```bash
# Клонировать из bundle
git clone myugbot-v3.bundle MYugBotV3
cd MYugBotV3

# Настроить и запустить
cp .env.production .env
nano .env
docker-compose up -d --build
```

---

## 🔄 Обновление на production

### Через GitHub:

```bash
cd MYugBotV3

# Остановить бота
docker-compose down

# Получить обновления
git pull origin main

# Перезапустить с пересборкой
docker-compose up -d --build

# Проверить логи
docker-compose logs -f
```

### Через локальный Git-сервер:

```bash
cd myugbot-v3

docker-compose down
git pull production main
docker-compose up -d --build
docker-compose logs -f
```

---

## 🏷️ Версионирование и теги

### Создание релизов:

```bash
# На исходном ПК
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial production release"
git push origin v1.0.0

# Последующие релизы
git tag -a v1.1.0 -m "Added new features"
git push origin v1.1.0
```

### Развертывание конкретной версии:

```bash
# На целевом ПК
git fetch --tags
git checkout v1.0.0

docker-compose up -d --build
```

---

## 🔧 Автоматизация с Git Hooks

### Post-receive hook для автодеплоя:

На Git-сервере создайте `/var/git/myugbot-v3.git/hooks/post-receive`:

```bash
#!/bin/bash

# Рабочая директория
WORK_DIR=/opt/myugbot-v3

# Обновить код
cd $WORK_DIR
git pull

# Перезапустить Docker
docker-compose down
docker-compose up -d --build

echo "✅ Deployment complete!"
```

```bash
chmod +x /var/git/myugbot-v3.git/hooks/post-receive
```

Теперь каждый `git push` автоматически обновляет production!

---

## 🚀 CI/CD с GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/myugbot-v3
          git pull origin main
          docker-compose down
          docker-compose up -d --build
          docker-compose logs --tail=50
```

Настройте secrets в GitHub:
- `PRODUCTION_HOST` - IP целевого ПК
- `PRODUCTION_USER` - SSH пользователь
- `SSH_PRIVATE_KEY` - приватный ключ SSH

---

## 📊 Сравнение методов

| Метод | Скорость | Обновления | Безопасность | Сложность |
|-------|----------|------------|--------------|-----------|
| **Tar архив** | ⚡ Быстро | ❌ Сложно | ⭐⭐⭐ | ⭐ Легко |
| **GitHub** | ⚡⚡ Средне | ✅ `git pull` | ⭐⭐ | ⭐⭐ Средне |
| **Локальный Git** | ⚡⚡ Средне | ✅ `git pull` | ⭐⭐⭐ | ⭐⭐⭐ Сложно |
| **Git Bundle** | ⚡ Быстро | ⭐ Средне | ⭐⭐⭐ | ⭐ Легко |
| **CI/CD** | ⚡⚡⚡ Авто | ✅✅ Авто | ⭐⭐ | ⭐⭐⭐⭐ Сложно |

---

## 🎯 Рекомендации

### Для разработки:
```bash
# Всегда используйте ветки
git checkout -b feature/new-feature
# ... делайте изменения ...
git commit -m "Add new feature"
git push origin feature/new-feature
# Создайте Pull Request на GitHub
```

### Для production:
```bash
# Только стабильные версии в main
git checkout main
git merge feature/new-feature
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin main --tags
```

---

## ✅ Быстрый старт через Git

### Исходный ПК:
```bash
cd /Users/mironocean/Documents/Progs/MYugBotV3
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/MYugBotV3.git
git push -u origin main
```

### Целевой ПК:
```bash
git clone https://github.com/YOUR_USERNAME/MYugBotV3.git
cd MYugBotV3
cp .env.production .env
nano .env
docker-compose up -d --build
```

### Обновления:
```bash
docker-compose down
git pull
docker-compose up -d --build
```

---

**⏱️ Первое развертывание: ~10 минут**  
**⏱️ Последующие обновления: ~2 минуты**

**🎉 Git + Docker = Идеальная комбинация для production!**

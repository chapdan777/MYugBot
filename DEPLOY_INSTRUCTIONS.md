# Инструкции по настройке CI/CD с помощью Git

Это руководство поможет вам настроить автоматическое развертывание вашего Node.js приложения при помощи `git push`.

## Шаг 1: Скрипт развертывания (`deploy.sh`)

Создайте на вашем сервере в директории с проектом (например, `/var/www/myug-bot`) файл `deploy.sh` со следующим содержимым.

```bash
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
```

**Важно:** Сделайте скрипт исполняемым:
```bash
chmod +x /var/www/myug-bot/deploy.sh
```

## Шаг 2: Настройка "голого" Git-репозитория на сервере

На вашем сервере вам понадобится "голый" (bare) Git-репозиторий. Он будет служить центральным репозиторием (как GitHub/GitLab, но на вашем сервере).

1.  **Создайте директорию для репозитория:**
    ```bash
    sudo mkdir -p /var/repo/myug-bot.git
    cd /var/repo/myug-bot.git
    ```

2.  **Инициализируйте голый репозиторий:**
    ```bash
    sudo git init --bare
    ```

## Шаг 3: Настройка Git Hook (post-receive)

Git hooks — это скрипты, которые Git запускает автоматически при определенных событиях. Мы будем использовать `post-receive`, который срабатывает после успешного `push` в репозиторий.

1.  **Создайте файл хука:**
    ```bash
    sudo nano /var/repo/myug-bot.git/hooks/post-receive
    ```

2.  **Добавьте в него следующий код:**
    ```bash
    #!/bin/bash
    
    # Путь к рабочей директории вашего проекта
    WORK_TREE="/var/www/myug-bot"
    
    # Путь к Git-директории
    GIT_DIR="/var/repo/myug-bot.git"
    
    echo "--- Starting deployment script ---"
    
    # Экспортируем переменную GIT_DIR, чтобы скрипт знал, где находится репозиторий
    export GIT_DIR
    
    # Выполняем checkout последней версии в рабочую директорию и запускаем скрипт развертывания
    git --work-tree=${WORK_TREE} --git-dir=${GIT_DIR} checkout -f
    
    # Запускаем наш скрипт развертывания
    /bin/bash ${WORK_TREE}/deploy.sh
    
    echo "--- Deployment script finished ---"
    ```

3.  **Сделайте хук исполняемым:**
    ```bash
    sudo chmod +x /var/repo/myug-bot.git/hooks/post-receive
    ```

## Шаг 4: Настройка локального репозитория

На вашем локальном компьютере добавьте новый `remote`, который будет указывать на ваш сервер.

```bash
# Пример: git remote add deploy ssh://user@your_server_ip/var/repo/myug-bot.git
git remote add deploy ssh://<ВАШ_ПОЛЬЗОВАТЕЛЬ>@<IP_АДРЕС_СЕРВЕРА>/var/repo/myug-bot.git
```

## Шаг 5: Развертывание

Теперь для развертывания достаточно выполнить одну команду с вашего локального компьютера:

```bash
git push deploy main # или master, в зависимости от вашей основной ветки
```

После выполнения этой команды вы увидите в терминале вывод от `post-receive` хука и вашего `deploy.sh` скрипта. Ваше приложение будет автоматически обновлено и перезапущено.
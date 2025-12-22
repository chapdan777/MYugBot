# Project Overview: MYugBotV3 - Telegram Bot on NestJS

This project is a re-engineered Telegram bot built with NestJS, Telegraf, and TypeScript, designed to manage business operations. It features a modular architecture, role-based access control, and integration with a Firebird Database.

## Technologies Used
*   **Framework**: NestJS
*   **Telegram Bot Library**: Telegraf
*   **Language**: TypeScript
*   **Database**: Firebird Database (ITM DB)
*   **Other**: npm, Docker

## Architecture and Key Features
The bot employs a modular architecture, with distinct modules for:
*   `bot`: Core Telegram bot logic, including scenes for multi-step dialogues, keyboard generators, and message filters.
*   `users`: User management, authentication by Telegram ID, and 7 levels of role-based access control.
*   `orders`: Order creation and management with various views.
*   `payments`: Payment processing and expense logging.
*   `shipments`: Shipment tracking.
*   `search`: Multi-parameter search functionality.
*   `expenses`: Expense logging.
*   `database`: Firebird DB interaction, including SQL queries and data repositories.
*   `common`: Shared utilities, decorators, guards, and interfaces.

Key features include:
*   **Modern Stack**: NestJS + Telegraf + TypeScript.
*   **Inline Keyboards**: Enhanced UX using the BotFather pattern (editing messages instead of sending new ones).
*   **Role-Based Access Control**: 7 granular role levels.
*   **Firebird Database**: Integration via a connection pool.

## Building and Running

### Requirements
*   Node.js >= 18.15.0
*   npm >= 9.5.0
*   Firebird Database (ITM DB)
*   Telegram Bot Token

### Installation
1.  Install dependencies: `npm install`
2.  Create and configure `.env` file from `.env.example`:
    ```bash
    cp .env.example .env
    # Edit .env with your specific configurations
    TELEGRAM_BOT_TOKEN=your_bot_token
    DB_HOST=localhost
    DB_PORT=3050
    DB_NAME=ITM
    DB_USER=SYSDBA
    DB_PASSWORD=your_password
    ```

### Running the Application

*   **Development Mode**:
    ```bash
    npm run start:dev
    ```
*   **Production Mode**:
    ```bash
    npm run build
    npm run start:prod
    ```
*   **Debug Mode**:
    ```bash
    npm run start:debug
    ```

### Docker Deployment
1.  Configure `.env` for production:
    ```bash
    cp .env.production .env
    # Edit .env if needed
    ```
2.  Run with Docker Compose:
    ```bash
    docker-compose up -d --build
    ```
3.  View logs:
    ```bash
    docker-compose logs -f
    ```
For more detailed Docker deployment instructions, refer to `DOCKER-DEPLOY.md`.

## Development Conventions and UI/UX Principles
The project adheres to the following principles:
*   **Inline Keyboards**: All interactions are primarily through inline buttons.
*   **Message Editing**: Buttons edit the current message rather than sending new ones, following the BotFather pattern.
*   **Callback Data**: Uses `action:entity:id:params` format for contextual navigation.
*   **Breadcrumbs**: Navigation path is preserved for a "Back" button.
*   **Main Menu**: Always accessible via a 🏠 button.

The codebase uses TypeScript, ESLint, and Prettier for code quality and consistency.

## TODOs (from project's README)
*   Extract SQL queries from flows.json.
*   Implement Scenes for multi-step dialogues.
*   Add validation for user input.
*   Implement administrator notifications.
*   Write unit and integration tests.
*   Set up a CI/CD pipeline.

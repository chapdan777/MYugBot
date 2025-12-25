import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as Firebird from 'node-firebird';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Сервис для работы с Firebird ITM Database
 * Управляет пулом соединений и выполнением запросов
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: any;
  private readonly config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3050', 10),
      database: process.env.DB_NAME || 'ITM',
      user: process.env.DB_USER || 'SYSDBA',
      password: process.env.DB_PASSWORD || 'masterkey',
    };
  }

  async onModuleInit() {
    // Создание пула соединений при инициализации модуля
    this.pool = Firebird.pool(5, this.config);
    console.log('✅ Пул соединений с ITM DB создан');
  }

  async onModuleDestroy() {
    // Закрытие пула при уничтожении модуля
    if (this.pool) {
      this.pool.destroy();
      console.log('✅ Пул соединений с ITM DB закрыт');
    }
  }

  /**
   * Выполнить SQL запрос
   * @param query SQL запрос с плейсхолдерами (?)
   * @param params Параметры запроса
   * @returns Результат запроса
   */
  async query<T = any>(query: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.pool.get((err, db) => {
        if (err) {
          console.error('DatabaseService: Ошибка получения соединения из пула:', err);
          return reject(err);
        }

        db.query(query, params, (err, result) => {
          db.detach(); // Возврат соединения в пул

          if (err) {
            console.error('DatabaseService: Ошибка выполнения запроса:', err);
            console.error('DatabaseService: Запрос:', query);
            console.error('DatabaseService: Параметры:', params);
            return reject(err);
          }

          resolve(result || []);
        });
      });
    });
  }

  /**
   * Выполнить запрос в транзакции
   */
  async transaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pool.get((err, db) => {
        if (err) {
          console.error('Ошибка получения соединения из пула:', err);
          return reject(err);
        }

        db.transaction(
          Firebird.ISOLATION_READ_COMMITTED,
          async (err, transaction) => {
            if (err) {
              db.detach();
              return reject(err);
            }

            try {
              const result = await callback(transaction);
              transaction.commit((err) => {
                db.detach();
                if (err) return reject(err);
                resolve(result);
              });
            } catch (error) {
              transaction.rollback(() => {
                db.detach();
                reject(error);
              });
            }
          }
        );
      });
    });
  }
}

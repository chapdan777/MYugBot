import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Firebird from 'node-firebird';

/**
 * Сервис для работы с базами данных Firebird
 */
@Injectable()
export class FirebirdService implements OnModuleInit {
  private readonly logger = new Logger(FirebirdService.name);
  private itmPool: any;
  // CUBIC база удалена - используем только ITM

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeDatabases();
  }

  /**
   * Инициализация подключений к базам данных
   */
  private async initializeDatabases() {
    try {
      // ITM Database (единственная база данных)
      const itmConfig = {
        host: this.configService.get('ITM_DB_HOST'),
        port: this.configService.get('ITM_DB_PORT'),
        database: this.configService.get('ITM_DB_DATABASE'),
        user: this.configService.get('ITM_DB_USER'),
        password: this.configService.get('ITM_DB_PASSWORD'),
      };

      this.logger.log('Инициализация подключения к базе данных ITM...');
      
      // В production лучше использовать pool connection
      this.itmPool = itmConfig;
      
      this.logger.log('✅ База данных ITM успешно инициализирована');
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации базы данных:', error);
      throw error;
    }
  }

  /**
   * Выполнение запроса к базе данных
   * @param database - 'itm' или 'cubic'
   * @param query - SQL запрос
   * @param params - параметры запроса
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const config = this.itmPool;

      Firebird.attach(config, (err, db) => {
        if (err) {
          this.logger.error(`Ошибка подключения к ITM:`, err);
          return reject(err);
        }

        db.query(query, params, (err, result) => {
          db.detach();

          if (err) {
            this.logger.error(`Ошибка выполнения запроса:`, err);
            return reject(err);
          }

          resolve(result as T[]);
        });
      });
    });
  }

  /**
   * Выполнение хранимой процедуры
   */
  async executeProcedure<T = any>(
    procedureName: string,
    params: any[] = [],
  ): Promise<T[]> {
    const query = `SELECT * FROM ${procedureName}(${params.map(() => '?').join(', ')})`;
    return this.executeQuery<T>(query, params);
  }
}

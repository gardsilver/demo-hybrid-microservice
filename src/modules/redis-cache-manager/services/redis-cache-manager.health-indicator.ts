import { RedisClientType } from '@keyv/redis';
import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { REDIS_CACHE_MANAGER_REDIS_CLIENT_DI } from '../types/tokens';
import { IRedisHealthIndicatorOptions } from '../types/types';

@Injectable()
export class RedisCacheManagerHealthIndicator {
  private readonly logger: IElkLoggerService;

  constructor(
    @Inject(REDIS_CACHE_MANAGER_REDIS_CLIENT_DI)
    private readonly redisClient: RedisClientType,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    this.logger = loggerBuilder.build({
      module: RedisCacheManagerHealthIndicator.name,
    });
  }

  async isHealthy(options?: IRedisHealthIndicatorOptions): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('Redis');
    const unavailableStatus: 'up' | 'down' = options?.unavailableStatus ?? 'up';

    let isPong = false;
    let pingReply: string | undefined;
    let pingError: Error | undefined;

    if (this.redisClient.isReady) {
      try {
        const reply = await this.redisClient.ping();
        pingReply = String(reply);
        isPong = reply === 'PONG';
      } catch (error) {
        pingError = error as Error;
      }
    }

    const isAvailable = this.redisClient.isReady && isPong;

    const details = {
      isOpen: this.redisClient.isOpen,
      isReady: this.redisClient.isReady,
      ping: isPong ? 'PONG' : (pingError?.message ?? pingReply ?? 'skipped'),
    };

    if (isAvailable) {
      return indicator.up(details);
    }

    // Warning-лог пишем только когда probe искусственно возвращает 'up' — чтобы оператор заметил,
    // что зелёный статус скрывает реальную проблему. Для 'down' доп. лог не нужен: probe красный и
    // так виден. Если клиент не готов (ping === 'skipped'), reconnect-стратегия уже пишет свой
    // лог — тоже не дублируем.
    if (unavailableStatus === 'up' && this.redisClient.isReady) {
      this.logger.warn('Redis is unavailable — probe reports up due to unavailableStatus option', {
        payload: { ...details, exception: pingError },
        ...TraceSpanBuilder.build(),
      });
    }

    return unavailableStatus === 'down' ? indicator.down(details) : indicator.up(details);
  }
}

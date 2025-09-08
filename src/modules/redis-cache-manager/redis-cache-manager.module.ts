/* eslint-disable @typescript-eslint/no-explicit-any */
import KeyvRedis, { createKeyv, KeyvRedisOptions, RedisClientOptions, RedisClientType } from '@keyv/redis';
import { ConfigModule } from '@nestjs/config';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { IRedisCacheManagerModuleOptions } from './types/module.options';
import {
  REDIS_CACHE_MANAGER_KEYV_REDIS_OPTIONS_DI,
  REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI,
  REDIS_CACHE_MANAGER_REDIS_CLIENT_OPTIONS_DI,
} from './types/tokens';
import { RedisCacheManagerConfig } from './services/redis-cache-manager.config';
import { defaultRedisReconnectStrategyBuilder } from './builders/default-redis.reconnect-strategy.builder';
import { RedisCacheService } from './services/redis-cache.service';
import { BaseRedisCacheFormatter } from './cache-formatters/base-redis.cache-formatter';

@Module({})
export class RedisCacheManagerModule {
  public static forRoot(options?: IRedisCacheManagerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];

    if (options?.imports?.length) {
      imports = imports.concat(options?.imports);
    }

    let providers: Provider[] = [
      ProviderBuilder.build(REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI, {
        providerType: options?.mapFormatters,
        defaultType: { useValue: {} },
      }),
      RedisCacheManagerConfig,
      BaseRedisCacheFormatter,
      RedisCacheService,
    ];

    if (options?.providers?.length) {
      providers = providers.concat(options?.providers);
    }

    let extraImports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];
    if (options?.imports?.length) {
      extraImports = extraImports.concat(options?.imports);
    }

    let extraProviders: Provider[] = [
      RedisCacheManagerConfig,
      ProviderBuilder.build(REDIS_CACHE_MANAGER_REDIS_CLIENT_OPTIONS_DI, {
        providerType: options?.redisClientOptions,
        defaultType: {
          inject: [RedisCacheManagerConfig],
          useFactory: (redisCacheManagerConfig: RedisCacheManagerConfig) => {
            return {
              url: 'redis://' + redisCacheManagerConfig.getRedisHost(),
              socket: {
                port: redisCacheManagerConfig.getRedisPort(),
              },
            };
          },
        },
      }),
      ProviderBuilder.build(REDIS_CACHE_MANAGER_KEYV_REDIS_OPTIONS_DI, {
        providerType: options?.keyvRedisOptions,
        defaultType: {
          useValue: {
            useUnlink: false,
            throwOnConnectError: false,
            throwOnErrors: false,
          },
        },
      }),
    ];

    if (options?.providers?.length) {
      extraProviders = extraProviders.concat(options?.providers);
    }

    imports.push(
      CacheModule.registerAsync({
        imports: extraImports,
        extraProviders,
        inject: [
          ELK_LOGGER_SERVICE_BUILDER_DI,
          RedisCacheManagerConfig,
          REDIS_CACHE_MANAGER_REDIS_CLIENT_OPTIONS_DI,
          REDIS_CACHE_MANAGER_KEYV_REDIS_OPTIONS_DI,
          PrometheusManager,
        ],
        useFactory: (
          loggerBuilder: IElkLoggerServiceBuilder,
          cacheManagerConfig: RedisCacheManagerConfig,
          defaultOptions: RedisClientOptions,
          keyvRedisOptions: KeyvRedisOptions,
          prometheusManager: PrometheusManager,
        ) => {
          const logger = loggerBuilder.build({
            module: 'RedisModule',
            ...TraceSpanBuilder.build(),
          });
          if (!defaultOptions.socket) {
            defaultOptions.socket = {};
          }
          if (!defaultOptions.socket?.reconnectStrategy) {
            defaultOptions.socket.reconnectStrategy = defaultRedisReconnectStrategyBuilder.build(
              logger,
              prometheusManager,
              cacheManagerConfig,
            );
          }

          defaultOptions.disableOfflineQueue = true;

          const keyv = createKeyv(defaultOptions, keyvRedisOptions);

          const keyvStore = keyv.store as KeyvRedis<any>;

          /** @TODO Без обработчиков событий не активируется reconnectStrategy
           * ВАЖНО:
           *  - обработчики должны быть (в том числе и пустые)
           *  - не имеет смыла подписываться на события Keyv.on() как в @keyv/redis не все события Redis реализованы.
           *  @see https://www.npmjs.com/package/redis#events
           */
          const redisClient = keyvStore.client as RedisClientType;

          redisClient.on('connect', () => {});
          redisClient.on('ready', () => {});
          redisClient.on('end', () => {});
          redisClient.on('error', () => {});
          redisClient.on('reconnecting', () => {});
          redisClient.on('sharded-channel-moved', () => {});

          return {
            stores: [keyv],
          };
        },
      }),
    );

    return {
      global: true,
      module: RedisCacheManagerModule,
      imports,
      providers,
      exports: [RedisCacheService],
    };
  }
}

import { KeyvRedisOptions, RedisClientOptions } from '@keyv/redis';
import { Provider } from '@nestjs/common';

import {
  IKeyValue,
  ImportsType,
  ServiceClassProvider,
  ServiceFactoryProvider,
  ServiceValueProvider,
} from 'src/modules/common';
import { RedisCacheFormatter } from './types';

export type MapRedisCacheFormatter = IKeyValue<RedisCacheFormatter<object>>;

export interface IRedisCacheManagerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  ttl?: number;
  redisClientOptions?:
    | ServiceClassProvider<RedisClientOptions>
    | ServiceFactoryProvider<RedisClientOptions>
    | ServiceValueProvider<RedisClientOptions>;
  keyvRedisOptions?:
    | ServiceClassProvider<KeyvRedisOptions>
    | ServiceFactoryProvider<KeyvRedisOptions>
    | ServiceValueProvider<KeyvRedisOptions>;
  mapFormatters?:
    | ServiceClassProvider<MapRedisCacheFormatter>
    | ServiceFactoryProvider<MapRedisCacheFormatter>
    | ServiceValueProvider<MapRedisCacheFormatter>;
}

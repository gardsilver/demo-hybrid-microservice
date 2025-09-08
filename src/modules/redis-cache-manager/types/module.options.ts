import { KeyvRedisOptions, RedisClientOptions } from '@keyv/redis';
import { Provider } from '@nestjs/common';
import { ImportsType, ServiceClassProvider, ServiceFactoryProvider, ServiceValueProvider } from 'src/modules/common';

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
}

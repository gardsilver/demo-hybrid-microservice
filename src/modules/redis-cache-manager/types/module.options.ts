import { KeyvRedisOptions, RedisClientOptions } from '@keyv/redis';
import { Provider } from '@nestjs/common';
import { ImportsType, IServiceClassProvider, IServiceFactoryProvider, IServiceValueProvider } from 'src/modules/common';

export interface IRedisCacheManagerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  ttl?: number;
  redisClientOptions?:
    | IServiceClassProvider<RedisClientOptions>
    | IServiceFactoryProvider<RedisClientOptions>
    | IServiceValueProvider<RedisClientOptions>;
  keyvRedisOptions?:
    | IServiceClassProvider<KeyvRedisOptions>
    | IServiceFactoryProvider<KeyvRedisOptions>
    | IServiceValueProvider<KeyvRedisOptions>;
}

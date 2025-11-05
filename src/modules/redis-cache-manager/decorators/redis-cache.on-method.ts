/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRedisCacheAdapter } from '../types/types';
import { RedisCacheInstanceService } from '../services/redis-cache.instance-service';
import { RedisCacheService } from '../services/redis-cache.service';

export function RedisCacheOnAsyncMethod(options: {
  cacheKeyAdapter: (...args: any[]) => string;
  adapter?: IRedisCacheAdapter | false;
  ttl?: number;
}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheService: RedisCacheService = RedisCacheInstanceService.getInstance();
      const cacheKey = options.cacheKeyAdapter(...args);

      let result = cacheService ? await cacheService.get(cacheKey, { adapter: options.adapter }) : undefined;

      if (result !== undefined) {
        return result;
      }

      result = await originalMethod.apply(this, args);

      if (result && cacheService) {
        cacheService.set(cacheKey, result, { adapter: options.adapter, ttl: options.ttl });
      }

      return result;
    };

    return descriptor;
  };
}

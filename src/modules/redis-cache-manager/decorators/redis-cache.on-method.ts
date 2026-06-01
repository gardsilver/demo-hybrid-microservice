/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRedisCacheAdapter } from '../types/types';
import { RedisCacheInstanceService } from '../services/redis-cache.instance-service';
import { RedisCacheService } from '../services/redis-cache.service';
import { copyMetadata } from 'src/modules/common/utils';

export function RedisCacheOnAsyncMethod(options: {
  cacheKeyAdapter: (...args: any[]) => string;
  adapter?: IRedisCacheAdapter | false;
  ttl?: number;
}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    const wrappedMethod = async function (this: any, ...args: any[]) {
      const cacheService: RedisCacheService = RedisCacheInstanceService.getInstance();
      const cacheKey = options.cacheKeyAdapter(...args);

      let result = cacheService ? await cacheService.get(cacheKey, { adapter: options.adapter }) : undefined;

      if (result !== undefined) {
        return result;
      }

      result = await originalMethod.apply(this, args);

      if (result !== undefined && cacheService) {
        cacheService.set(cacheKey, result, { adapter: options.adapter, ttl: options.ttl });
      }

      return result;
    };

    copyMetadata(wrappedMethod, originalMethod);
    descriptor.value = wrappedMethod;

    return descriptor;
  };
}

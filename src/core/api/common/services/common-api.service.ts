import { Injectable } from '@nestjs/common';
import { RedisCacheOnAsyncMethod } from 'src/modules/redis-cache-manager';
import { IUser, UserJsonCacheAdapter, UserService } from 'src/core/repositories/postgres';

@Injectable()
export class CommonApiService {
  constructor(private readonly userService: UserService) {}

  @RedisCacheOnAsyncMethod({
    cacheKeyAdapter: (query: string) => query,
    adapter: new UserJsonCacheAdapter(),
    ttl: 10_000,
  })
  public async getUser(query: string): Promise<IUser> {
    return this.userService.findUser({ name: query });
  }
}

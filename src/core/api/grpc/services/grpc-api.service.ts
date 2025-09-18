import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/modules/redis-cache-manager';
import { IUser, UserJsonCacheAdapter, UserService } from 'src/core/repositories/postgres';

@Injectable()
export class GrpcApiService {
  constructor(
    private readonly userService: UserService,
    private readonly cacheService: RedisCacheService,
    private readonly userJsonCacheAdapter: UserJsonCacheAdapter,
  ) {}

  public async getUser(query: string): Promise<IUser> {
    let result = await this.cacheService.get<IUser>(query, { adapter: this.userJsonCacheAdapter });

    if (result !== undefined) {
      return result as undefined as IUser;
    }

    result = await this.userService.findUser({
      name: query,
    });

    if (result) {
      this.cacheService.set(query, result, { adapter: this.userJsonCacheAdapter, ttl: 10_000 });
    }

    return result;
  }
}

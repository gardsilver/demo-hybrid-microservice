import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/modules/redis-cache-manager';
import { IUser, UserJsonCacheFormatter, UserService } from 'src/core/repositories/postgres';

@Injectable()
export class GrpcApiService {
  constructor(
    private readonly userService: UserService,
    private readonly cacheService: RedisCacheService,
    private readonly userCacheFormatter: UserJsonCacheFormatter,
  ) {}

  public async getUser(query: string): Promise<IUser> {
    let result = await this.cacheService.get<IUser>(query, { formatter: this.userCacheFormatter });

    if (result !== undefined) {
      return result as undefined as IUser;
    }

    result = await this.userService.findUser({
      name: query,
    });

    if (result) {
      this.cacheService.set(query, result, { formatter: this.userCacheFormatter, ttl: 10_000 });
    }

    return result;
  }
}

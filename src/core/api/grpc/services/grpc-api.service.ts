import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/modules/redis-cache-manager';
import { IUser, UserCacheFormatter, UserService } from 'src/core/repositories/postgres';

@Injectable()
export class GrpcApiService {
  constructor(
    private readonly userService: UserService,
    private readonly cacheService: RedisCacheService,
  ) {}

  public async getUser(query: string): Promise<IUser> {
    let result = await this.cacheService.get<IUser>(query, UserCacheFormatter.type);

    if (result !== undefined) {
      return result;
    }

    result = await this.userService.findUser({
      name: query,
    });

    if (result) {
      this.cacheService.set(query, { value: result, type: UserCacheFormatter.type }, 10_000);
    }

    return result;
  }
}

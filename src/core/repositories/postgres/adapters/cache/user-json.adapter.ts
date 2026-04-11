import { Injectable } from '@nestjs/common';
import { IRedisCacheAdapter } from 'src/modules/redis-cache-manager';
import { IUser } from '../../types/types';

@Injectable()
export class UserJsonCacheAdapter implements IRedisCacheAdapter<IUser> {
  public encode(data?: string): IUser | undefined {
    if (data === undefined) {
      return undefined;
    }

    const parse = JSON.parse(data) as undefined as IUser;

    return {
      ...parse,
      createdAt: new Date(parse.createdAt),
      updatedAt: new Date(parse.updatedAt),
    };
  }

  public decode(data: IUser): string {
    return JSON.stringify(data);
  }
}

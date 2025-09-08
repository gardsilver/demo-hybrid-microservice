import { Injectable } from '@nestjs/common';
import { IRedisCacheFormatter } from 'src/modules/redis-cache-manager';
import { IUser } from '../types/types';

@Injectable()
export class UserJsonCacheFormatter implements IRedisCacheFormatter<IUser> {
  public encode(data?: string): IUser | undefined {
    if (data === undefined) {
      return undefined;
    }

    const parse = JSON.parse(data) as undefined as IUser;

    return {
      ...parse,
      createdAt: parse.createdAt ? new Date(parse.createdAt) : undefined,
      updatedAt: parse.createdAt ? new Date(parse.updatedAt) : undefined,
    };
  }

  public decode(data: IUser): string {
    return JSON.stringify(data);
  }
}

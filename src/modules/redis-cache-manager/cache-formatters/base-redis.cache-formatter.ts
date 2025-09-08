/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { RedisCacheFormatter } from '../types/types';

@Injectable()
export class BaseRedisCacheFormatter extends RedisCacheFormatter<any> {
  public static type = 'any';

  public type() {
    return BaseRedisCacheFormatter.type;
  }

  public encode(data?: string): any | undefined {
    if (data === undefined) {
      return undefined;
    }

    return JSON.parse(data) as undefined as any;
  }

  public decode(data: unknown): string {
    return JSON.stringify(data);
  }
}

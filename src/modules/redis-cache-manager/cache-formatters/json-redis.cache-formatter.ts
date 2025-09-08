/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { IRedisCacheFormatter } from '../types/types';

@Injectable()
export class JsonRedisCacheFormatter implements IRedisCacheFormatter<any> {
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

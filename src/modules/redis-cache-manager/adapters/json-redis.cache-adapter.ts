/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { IRedisCacheAdapter } from '../types/types';

@Injectable()
export class JsonRedisCacheAdapter implements IRedisCacheAdapter<any> {
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

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IRedisCacheAdapter<T extends object = object | any> {
  encode(data?: string): T | undefined;
  decode(data: T): string;
}

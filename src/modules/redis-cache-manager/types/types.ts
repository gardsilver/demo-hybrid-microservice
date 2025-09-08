/* eslint-disable @typescript-eslint/no-explicit-any */

export abstract class RedisCacheFormatter<T extends object = object | any> {
  public static type: string;
  public abstract type(): string;
  public abstract encode(data?: string): T;
  public abstract decode(data: T): string;
}

import { IKeyValue } from 'src/modules/common';

export class MockConfigService {
  private readonly config: IKeyValue<string>;

  constructor(config?: IKeyValue<string>) {
    this.config = config ?? {};
  }

  get<T = string>(key: string, defaultValue?: T): T {
    return (this.config[key] ?? defaultValue) as unknown as T;
  }

  getOrThrow<T = string>(key: string): T {
    if (key in this.config) {
      return this.config[key] as unknown as T;
    }
    throw new Error(`Неизвестный параметр ${key}`);
  }
}

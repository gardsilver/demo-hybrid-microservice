import { IKeyValue } from 'src/modules/common';

export class MockConfigService {
  constructor(private readonly config?: IKeyValue<string>) {
    this.config = this.config ?? {};
  }

  get<T = string>(key: string, defaultValue?: T): T {
    return (this.config[key] ?? defaultValue) as undefined as T;
  }

  getOrThrow<T = string>(key: string): T {
    if (key in this.config) {
      return this.config[key] as undefined as T;
    }
    throw new Error(`Неизвестный параметр ${key}`);
  }
}

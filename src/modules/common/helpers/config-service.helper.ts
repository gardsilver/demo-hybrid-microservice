import { ConfigService } from '@nestjs/config';

export class ConfigServiceHelper {
  constructor(
    private readonly config: ConfigService,
    private readonly prefix: string = '',
  ) {}

  public getKeyName(key: string): string {
    return this.prefix + key;
  }

  public error(keyName: string, value: string, needValue?: string): never {
    let message = `Не корректно задан параметр: ${keyName}='${value}'.`;

    if (needValue) {
      message += ` Ожидается: ${needValue}.`;
    }

    throw new Error(message);
  }

  public parseBoolean(key: string, defaultValue: boolean = true): boolean | never {
    const keyName = this.getKeyName(key);

    const value = this.config.get<string>(keyName, '').trim().toLowerCase();
    if (value === '') {
      return defaultValue;
    }

    if (['yes', 'no'].includes(value)) {
      return value === 'yes';
    }

    this.error(keyName, value, "одно из значений ['yes', 'no']");
  }

  public parseInt<T>(key: string, defaultValue: T): number | T | never {
    const keyName = this.getKeyName(key);
    const value = this.config.get<string>(keyName, '').trim();

    if (value === '') {
      return defaultValue;
    }

    const parse = parseInt(value);

    if (isNaN(parse)) {
      this.error(keyName, value);
    }

    return parse;
  }

  public parseArray(key: string, separator: string = ','): Array<string> {
    const keyName = this.getKeyName(key);

    return this.config
      .get<string>(keyName, '')
      .trim()
      .split(separator)
      .map((value) => value.trim())
      .filter((value) => value !== '');
  }
}

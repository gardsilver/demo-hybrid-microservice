import { Injectable } from '@nestjs/common';
import { ILogBody, ILogRecord, ILogRecordFormatter, ElkLoggerConfig } from 'src/modules/elk-logger';
import { IKeyValue } from 'src/modules/common';
import { COOKIE_HEADER_NAME, AUTHORIZATION_HEADER_NAME } from '../../types/security.constants';

const HEADERS_KEYS = ['headers', 'metadata'];
const REPLACE_VALUE = ' ***** ';

@Injectable()
export class HttpSecurityHeadersFormatter implements ILogRecordFormatter {
  private readonly removeList = [COOKIE_HEADER_NAME.toString(), AUTHORIZATION_HEADER_NAME.toString()];

  constructor(private readonly elkLoggerConfig: ElkLoggerConfig) {}

  priority(): number {
    return 0;
  }

  transform(from: ILogRecord): ILogRecord {
    const normalized = this.replaceKeyValue(
      {
        businessData: from.businessData,
        payload: from.payload,
      },
      [],
    ) as ILogBody;

    return {
      ...from,
      ...normalized,
    };
  }

  private needReplace(path: string[]): boolean {
    const isNeed = HEADERS_KEYS.reduce((need, value) => {
      return need || path.includes(value);
    }, false);
    if (!isNeed) {
      return false;
    }

    return this.removeList.reduce((isFirst, current) => {
      return isFirst || path.includes(current.toLowerCase());
    }, false);
  }

  private replaceKeyValue(src: IKeyValue, path: string[]): IKeyValue {
    const tgt: IKeyValue = {};

    for (const [key, value] of Object.entries(src)) {
      tgt[key] = this.replaceValue(value, path.concat([key.toLowerCase()]));
    }

    return tgt;
  }

  private replaceValue(value: unknown, path: string[]): unknown {
    if (!value) {
      return value;
    }

    if (typeof value === 'string') {
      if (path.length && this.needReplace(path)) {
        return REPLACE_VALUE;
      }

      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.replaceValue(v, path));
    }

    if (typeof value === 'object') {
      if (this.elkLoggerConfig.isIgnoreObject(value)) {
        return value;
      }

      return this.replaceKeyValue(value as IKeyValue, path);
    }

    return value;
  }
}

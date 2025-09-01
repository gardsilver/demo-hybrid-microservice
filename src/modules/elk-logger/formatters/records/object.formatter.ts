import { IKeyValue } from 'src/modules/common';
import { ILogRecord, ILogRecordFormatter, IObjectFormatter } from '../../types/elk-logger.types';
import { ElkLoggerConfig } from '../../services/elk-logger.config';

export class ObjectFormatter implements ILogRecordFormatter {
  constructor(
    private readonly elkLoggerConfig: ElkLoggerConfig,
    private readonly objectFormatters: IObjectFormatter[],
  ) {}

  transform(from: ILogRecord): ILogRecord {
    const normalized = this.replaceKeyValue({
      businessData: from.businessData,
      payload: from.payload,
    });

    return {
      ...from,
      ...normalized,
    };
  }

  private replaceKeyValue(src: IKeyValue): IKeyValue {
    const tgt: IKeyValue = {};

    for (const [key, value] of Object.entries(src)) {
      tgt[key] = this.replaceValue(value);
    }

    return tgt;
  }

  private replaceValue(value: unknown): unknown {
    if (!value) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.replaceValue(v));
    }

    if (typeof value === 'object') {
      const formatter = this.objectFormatters.find((objectFormatter) => objectFormatter.canFormat(value));

      if (formatter !== undefined) {
        return formatter.transform(value);
      }

      if (this.elkLoggerConfig.isIgnoreObject(value)) {
        return value;
      }

      return this.replaceKeyValue(value as IKeyValue);
    }

    return value;
  }
}

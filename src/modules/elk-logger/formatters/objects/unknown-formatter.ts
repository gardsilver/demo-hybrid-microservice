import { IKeyValue } from 'src/modules/common';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { IObjectFormatter, IUnknownFormatter } from '../../types/elk-logger.types';

export class UnknownFormatter implements IUnknownFormatter {
  constructor(
    private readonly elkLoggerConfig: ElkLoggerConfig,
    private readonly objectFormatters: IObjectFormatter[],
  ) {}

  public transform(value: unknown): unknown | IKeyValue<unknown> {
    if (value !== undefined && value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((val) => this.transform(val));
      }

      const formatter = this.objectFormatters.find((objectFormatter) => objectFormatter.canFormat(value));

      if (formatter !== undefined) {
        return formatter.transform(value);
      }

      if (this.elkLoggerConfig.isIgnoreObject(value)) {
        return value;
      }

      const tgt: IKeyValue = {};

      for (const [key, val] of Object.entries(value)) {
        tgt[key] = this.transform(val);
      }

      return tgt;
    }

    return value;
  }
}

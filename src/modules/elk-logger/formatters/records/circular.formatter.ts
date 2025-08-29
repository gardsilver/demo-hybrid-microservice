import { Injectable } from '@nestjs/common';
import { IKeyValue, circularRemove } from 'src/modules/common';
import { ILogRecordFormatter, ILogRecord } from '../../types/elk-logger.types';
import { ElkLoggerConfig } from '../../services/elk-logger.config';

@Injectable()
export class CircularFormatter implements ILogRecordFormatter {
  constructor(private readonly elkLoggerConfig: ElkLoggerConfig) {}

  priority(): number {
    return -Infinity;
  }

  transform(from: ILogRecord): ILogRecord {
    const normalized = this.filterKeyValue(
      circularRemove(
        {
          businessData: from.businessData,
          payload: from.payload,
        },
        {
          template: true,
          ignoreObjects: this.elkLoggerConfig.getIgnoreObjects(),
        },
      ) as IKeyValue,
    );

    return {
      ...from,
      ...normalized,
    };
  }

  private filterKeyValue(data: IKeyValue): IKeyValue {
    const tgt: IKeyValue = Object.assign({}, data);

    for (const fieldName in data) {
      const fieldValue = data[fieldName];

      if (fieldValue === undefined) {
        delete data[fieldName];

        continue;
      }

      tgt[fieldName] = this.filterValue(fieldValue);
    }

    return tgt;
  }

  private filterValue(fieldValue: unknown): unknown {
    if (!fieldValue) {
      return fieldValue;
    }

    if (Array.isArray(fieldValue)) {
      return fieldValue.filter((v) => v !== undefined).map((v) => this.filterValue(v));
    }

    if (typeof fieldValue === 'object') {
      if (this.elkLoggerConfig.isIgnoreObject(fieldValue)) {
        return fieldValue;
      }

      return this.filterKeyValue(fieldValue as IKeyValue);
    }

    return fieldValue;
  }
}

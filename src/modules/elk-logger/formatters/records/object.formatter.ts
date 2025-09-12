import { IKeyValue } from 'src/modules/common';
import { ILogRecord, ILogRecordFormatter, IUnknownFormatter } from '../../types/elk-logger.types';

export class ObjectFormatter implements ILogRecordFormatter {
  constructor(private readonly unknownFormatter: IUnknownFormatter) {}

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
      tgt[key] = this.unknownFormatter.transform(value);
    }

    return tgt;
  }
}

import { circularReplacerBuilder } from 'src/modules/common';
import { ILogRecordEncodeFormatter, ILogRecord } from '../../types/elk-logger.types';

export class FileFormatter implements ILogRecordEncodeFormatter {
  transform(from: ILogRecord): string {
    return (
      [
        from.timestamp,
        from.level,
        JSON.stringify(
          {
            ...from,
            level: undefined,
            timestamp: undefined,
          },
          circularReplacerBuilder(),
        ),
      ].join('\t') + '\n'
    );
  }
}

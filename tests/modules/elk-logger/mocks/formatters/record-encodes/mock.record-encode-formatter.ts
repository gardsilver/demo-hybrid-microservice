import { ILogRecord, ILogRecordEncodeFormatter } from 'src/modules/elk-logger';

export class MockRecordEncodeFormatter implements ILogRecordEncodeFormatter {
  transform(from: ILogRecord): string {
    return `${from.message}`;
  }
}

import { ILogRecord, ILogRecordFormatter } from 'src/modules/elk-logger';

export class MockFormatter implements ILogRecordFormatter {
  transform(from: ILogRecord): ILogRecord {
    return from;
  }
}

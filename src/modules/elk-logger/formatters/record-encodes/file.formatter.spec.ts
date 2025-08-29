import { merge } from 'ts-deepmerge';
import { LoggerMarkers } from 'src/modules/common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { FileFormatter } from './file.formatter';

describe(FileFormatter.name, () => {
  let formatter: FileFormatter;

  beforeAll(async () => {
    formatter = new FileFormatter();
  });

  it('transform', async () => {
    const error = new Error('test');

    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      payload: {
        details: ['start process'],
        error,
      },
    });

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual(
      `${logRecord.timestamp}\t${logRecord.level}\t{"markers":["request"],"payload":{"details":["start process"],"error":{}},` +
        `"message":"${logRecord.message}","module":"${logRecord.module}",` +
        `"traceId":"${logRecord.traceId}","spanId":"${logRecord.spanId}"}\n`,
    );
  });
});

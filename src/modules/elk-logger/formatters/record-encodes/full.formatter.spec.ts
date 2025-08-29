import { merge } from 'ts-deepmerge';
import { LoggerMarkers } from 'src/modules/common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { FullFormatter } from './full.formatter';

describe(FullFormatter.name, () => {
  let formatter: FullFormatter;

  beforeAll(async () => {
    formatter = new FullFormatter();
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
      `{"markers":["request"],"payload":{"details":["start process"],"error":{}},` +
        `"level":"INFO","message":"${logRecord.message}","module":"${logRecord.module}",` +
        `"timestamp":"${logRecord.timestamp}","traceId":"${logRecord.traceId}","spanId":"${logRecord.spanId}"}`,
    );
  });
});

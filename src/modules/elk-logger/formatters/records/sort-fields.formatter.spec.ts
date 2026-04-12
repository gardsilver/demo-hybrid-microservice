import { merge } from 'ts-deepmerge';
import { LoggerMarkers } from 'src/modules/common';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { SortFieldsFormatter } from './sort-fields.formatter';
import { ElkLoggerConfig } from '../../services/elk-logger.config';

describe(SortFieldsFormatter.name, () => {
  let formatter: SortFieldsFormatter;

  beforeAll(async () => {
    formatter = new SortFieldsFormatter({
      getSortFields: () => ['timestamp', 'level', 'traceId', 'message', 'module'],
    } as ElkLoggerConfig);
  });

  it('init', async () => {
    expect(formatter).toBeDefined();
    expect(formatter['orderList']).toEqual([
      'timestamp',
      'level',
      'traceId',
      'message',
      'module',
      'markers',
      'businessData',
      'initialSpanId',
      'spanId',
      'parentSpanId',
      'payload',
    ]);
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

    const expectedOrder = [
      'timestamp',
      'level',
      'traceId',
      'message',
      'module',
      'markers',
      'spanId',
      'payload',
      ...Object.keys(logRecord).filter(
        (k) => !['timestamp', 'level', 'traceId', 'message', 'module', 'markers', 'spanId', 'payload'].includes(k),
      ),
    ];

    expect(Object.keys(encodeLogRecord)).toEqual(expectedOrder);
  });
});

import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { LogFieldsHelper } from './log-fields.helper';
import { TraceSpanBuilder } from '../builders/trace-span.builder';

describe(LogFieldsHelper.name, () => {
  it('filterMarkers', async () => {
    const ts = TraceSpanBuilder.build();
    const error = new Error('test');
    const fileBody = faker.string.sample({ min: 10, max: 20 });
    const time = new Date();
    const date = new DateTimestamp();
    const programs = [1, 3, '56', 456, 'tg', 12, 56, 91, 223, 5467, time];

    const logRecord = logRecordFactory.build({
      ...ts,
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.RESPONSE, LoggerMarkers.BAD, LoggerMarkers.RESPONSE],
      businessData: {
        dateTime: date,
      },
      payload: {
        date,
        details: ['finish process'],
        programs,
        request: {
          body: {
            time,
            programs,
            fileBody,
            error,
          },
        },
        error,
      },
    });

    const copyLogRecord = merge({}, logRecord);

    const result = LogFieldsHelper.filterMarkers(logRecord);

    expect(copyLogRecord).toEqual(logRecord);
    expect(result).toEqual({
      ...logRecord,
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.RESPONSE, LoggerMarkers.BAD],
    });
  });

  it('merge', async () => {
    const ts = TraceSpanBuilder.build();
    const error = new Error('test');
    const fileBody = faker.string.sample({ min: 10, max: 20 });
    const time = new Date();
    const date = new DateTimestamp();
    const programs = [1, 3, '56', 456, 'tg', 12, 56, 91, 223, 5467, time];

    const logRecordA = logRecordFactory.build({
      ...ts,
      markers: [LoggerMarkers.REQUEST],
      payload: {
        details: ['start process'],
      },
    });

    const logRecordB = logRecordFactory.build({
      ...ts,
      markers: [LoggerMarkers.RESPONSE],
      businessData: {
        dateTime: date,
      },
      payload: {
        date,
        details: ['finish process'],
        programs,
        request: {
          body: {
            time,
            programs,
            fileBody,
            error,
          },
        },
        error,
      },
    });

    const copyLogRecordA = merge({}, logRecordA);
    const copyLogRecordB = merge({}, logRecordB);

    const result = LogFieldsHelper.merge(logRecordA, logRecordB);

    expect(copyLogRecordA).toEqual(logRecordA);
    expect(copyLogRecordB).toEqual(logRecordB);
    expect(result).toEqual({
      ...logRecordA,
      ...logRecordB,
      markers: logRecordA.markers.concat(logRecordB.markers),
      module: `${logRecordA.module}.${logRecordB.module}`,
      payload: {
        ...logRecordA.payload,
        ...logRecordB.payload,
        details: (logRecordA.payload.details as undefined as Array<string>).concat(
          logRecordB.payload.details as undefined as Array<string>,
        ),
      },
    });
  });
});

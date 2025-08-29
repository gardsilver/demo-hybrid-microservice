import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { ILogRecord, LogLevel, TraceSpanBuilder } from 'src/modules/elk-logger';

export const logRecordFactory = Factory.define<ILogRecord>(({ params }) => {
  const ts = TraceSpanBuilder.build(params);

  return {
    ...params,
    level: params?.level ?? LogLevel.INFO,
    message:
      params?.message ??
      faker.string.sample({ min: 10, max: 20 })?.replaceAll('"', '')?.replaceAll("'", '')?.replaceAll('\\', ''),
    module:
      params?.module ??
      faker.string
        .alpha({ length: { min: 10, max: 20 } })
        ?.replaceAll('"', '')
        ?.replaceAll("'", '')
        ?.replaceAll('\\', ''),
    timestamp: params?.timestamp ?? new DateTimestamp().format(),
    traceId: params?.traceId ?? ts.traceId,
    spanId: params?.spanId ?? ts.spanId,
  } as ILogRecord;
});

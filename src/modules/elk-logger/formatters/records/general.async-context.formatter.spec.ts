import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { GeneralAsyncContext, IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { ILogRecord } from '../../types/elk-logger.types';
import { LogLevel } from '../../types/elk-logger.types';
import { ITraceSpan } from '../../types/trace-span';
import { TraceSpanBuilder } from '../../builders/trace-span.builder';
import { ProcessTraceSpanStore } from '../../services/process-trace-span.store';
import { GeneralAsyncContextFormatter } from './general.async-context.formatter';

describe(GeneralAsyncContextFormatter.name, () => {
  let formatter: GeneralAsyncContextFormatter;
  let mockLogRecord: ILogRecord;
  let mockContext: IGeneralAsyncContext;

  beforeAll(async () => {
    mockContext = {
      ...TraceSpanBuilder.build(),
      correlationId: faker.string.uuid(),
      requestId: faker.string.uuid(),
    };

    formatter = new GeneralAsyncContextFormatter();
    mockLogRecord = {
      level: LogLevel.INFO,
      module: 'TestModule',
      markers: [LoggerMarkers.REQUEST],
      payload: {
        details: ['start process'],
      },
    } as unknown as ILogRecord;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(formatter).toBeDefined();
    expect(formatter.priority()).toEqual(0);
  });

  it('add GeneralAsyncContext', async () => {
    const spyOnExtend = jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => mockContext);

    const copy = merge({}, mockLogRecord);

    expect(copy).toEqual(mockLogRecord);

    const format = formatter.transform(mockLogRecord);

    expect(spyOnExtend).toHaveBeenCalledTimes(1);
    expect(copy).toEqual(mockLogRecord);
    expect(format).toEqual({
      ...mockLogRecord,
      ...mockContext,
      correlationId: undefined,
      requestId: undefined,
    });
  });

  it('uses ProcessTraceSpanStore fallback when context has no trace ids', async () => {
    const fallback: ITraceSpan = TraceSpanBuilder.build();

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => ({}) as IGeneralAsyncContext);
    const spyOnFallback = jest.spyOn(ProcessTraceSpanStore.instance, 'get').mockImplementation(() => fallback);

    const format = formatter.transform(mockLogRecord);

    expect(spyOnFallback).toHaveBeenCalledTimes(1);
    expect(format).toEqual({
      ...mockLogRecord,
      traceId: fallback.traceId,
      spanId: fallback.spanId,
    });
  });

  it('keeps existing trace ids on the record and skips fallback', async () => {
    const recordTraceSpan: ITraceSpan = TraceSpanBuilder.build();
    const recordWithIds: ILogRecord = { ...mockLogRecord, ...recordTraceSpan };

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => mockContext);
    const spyOnFallback = jest.spyOn(ProcessTraceSpanStore.instance, 'get');

    const format = formatter.transform(recordWithIds);

    expect(spyOnFallback).not.toHaveBeenCalled();
    expect(format).toEqual({
      ...recordWithIds,
      correlationId: undefined,
      requestId: undefined,
    });
  });
});

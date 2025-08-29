import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { ILogRecord, LogLevel, TraceSpanBuilder } from 'src/modules/elk-logger';
import { EmptyAsyncContextError } from 'src/modules/async-context';
import { GeneralAsyncContextFormatter } from './general.async-context.formatter';
import { IGeneralAsyncContext } from '../../types/general.async-context.type';
import { LoggerMarkers } from '../../types/logger.markers';
import { GeneralAsyncContext } from '../../context/general.async-context';

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
    } as undefined as ILogRecord;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(formatter).toBeDefined();
    expect(formatter.priority()).toEqual(0);
  });

  it('Empty GeneralAsyncContext', async () => {
    const spyOnExtend = jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => {
      throw new EmptyAsyncContextError();
    });

    const copy = merge({}, mockLogRecord);

    expect(copy).toEqual(mockLogRecord);

    const format = formatter.transform(mockLogRecord);

    expect(spyOnExtend).toHaveBeenCalledTimes(1);
    expect(copy).toEqual(mockLogRecord);
    expect(format).toEqual(mockLogRecord);
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
});

import { ConfigService } from '@nestjs/config';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { ILogRecord } from '../../types/elk-logger.types';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { ObjectFormatter } from './object.formatter';

describe(ObjectFormatter.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;
  let formatter: ObjectFormatter;

  beforeEach(async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);
    formatter = new ObjectFormatter(loggerConfig, [new MockObjectFormatter()]);
    jest.clearAllMocks();
  });

  it('transform', async () => {
    const current = new DateTimestamp();
    const now = new Date();

    const logRecord: ILogRecord = {
      businessData: {
        status: 'ok',
        error: new Error('test'),
      },
      payload: {
        current,
        now,
        details: {
          message: 'message',
          now,
          array: ['success', 123, { data: {} }, current],
        },
      },
    } as undefined as ILogRecord;

    expect(formatter.transform(logRecord)).toEqual({
      businessData: {
        field: 'fieldName',
      },
      payload: {
        field: 'fieldName',
      },
    });

    jest.spyOn(MockObjectFormatter.prototype, 'canFormat').mockImplementation((obj) => obj instanceof Error);

    expect(formatter.transform(logRecord)).toEqual({
      businessData: {
        status: 'ok',
        error: {
          field: 'fieldName',
        },
      },
      payload: {
        current,
        now,
        details: {
          message: 'message',
          now,
          array: ['success', 123, { data: {} }, current],
        },
      },
    });
  });
});

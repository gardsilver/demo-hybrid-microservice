import { ConfigService } from '@nestjs/config';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { UnknownFormatter } from './unknown-formatter';

describe(UnknownFormatter.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;
  let formatter: UnknownFormatter;

  beforeEach(async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);
    formatter = new UnknownFormatter(loggerConfig, [new MockObjectFormatter()]);
    jest.clearAllMocks();
  });

  it('transform', async () => {
    expect(formatter.transform(undefined)).toBeUndefined();
    expect(formatter.transform(null)).toBeNull();
    expect(formatter.transform('success')).toBe('success');
    expect(formatter.transform(12345)).toBe(12345);
    expect(formatter.transform(true)).toBeTruthy();

    const current = new DateTimestamp();
    const now = new Date();
    const error = new Error('test');

    const logRecord = {
      businessData: {
        status: 'ok',
        error: error,
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
    };

    expect(formatter.transform(logRecord.businessData)).toEqual({
      field: 'fieldName',
    });

    expect(formatter.transform(logRecord.payload)).toEqual({
      field: 'fieldName',
    });

    jest.spyOn(MockObjectFormatter.prototype, 'canFormat').mockImplementation((obj) => obj instanceof Error);

    expect(formatter.transform(logRecord.businessData)).toEqual({
      status: 'ok',
      error: {
        field: 'fieldName',
      },
    });

    expect(formatter.transform(logRecord.payload)).toEqual({
      current,
      now,
      details: {
        message: 'message',
        now,
        array: ['success', 123, { data: {} }, current],
      },
    });
  });
});

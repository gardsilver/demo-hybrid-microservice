import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { ConfigService } from '@nestjs/config';
import { IKeyValue, LoggerMarkers } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { CircularFormatter } from './circular.formatter';

describe(CircularFormatter.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;
  let formatter: CircularFormatter;

  beforeAll(async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);
    formatter = new CircularFormatter(loggerConfig);
  });

  it('init', async () => {
    expect(formatter).toBeDefined();

    expect({
      isIgnoreObject: loggerConfig.isIgnoreObject(new Error()),
    }).toEqual({
      isIgnoreObject: true,
    });
  });

  it('transform', async () => {
    const error = new Error('test');
    const fileBody = faker.string.sample({ min: 10, max: 20 });
    const time = new Date();
    const date = new DateTimestamp();
    const programs = [1, 3, '56', 456, 'tg', 12, 56, 91, 223, 5467, time];

    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      businessData: {
        dateTime: date,
      },
      payload: {
        date,
        details: ['start process'],
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
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);

    expect(encodeLogRecord).toEqual({
      ...logRecord,
      payload: {
        ...logRecord.payload,
        date: 'Circular[* 3]',
        request: {
          ...(logRecord.payload['request'] as IKeyValue),
          body: {
            ...(logRecord.payload['request']['body'] as IKeyValue),
            time: 'Circular[* 7]',
            programs: 'Circular[* 6]',
          },
        },
        error: 'Circular[* 10]',
      },
    });
  });
});

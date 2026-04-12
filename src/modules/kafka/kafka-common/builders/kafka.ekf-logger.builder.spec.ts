import { faker } from '@faker-js/faker';
import { LogEntry, logLevel, logCreator } from 'kafkajs';
import { Test } from '@nestjs/testing';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  LogLevel,
  ILogFields,
} from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { KafkaElkLoggerBuilder, kafkaLogFilter } from './kafka.ekf-logger.builder';

describe(KafkaElkLoggerBuilder.name, () => {
  const logFields: ILogFields = {
    module: 'TestModule',
  };
  let entry: LogEntry;
  let logger: IElkLoggerService, loggerBuilder: IElkLoggerServiceBuilder;
  let kafkaLogger: logCreator;
  let spyOnLogger: jest.SpyInstance;
  let spyOnLoggerBuilder: jest.SpyInstance;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);

    entry = {
      namespace: 'namespace',
      level: logLevel.INFO,
      label: 'label',
      log: {
        timestamp: 'timestamp',
        message: 'message',
        data: {
          details: 'details',
        },
      },
    };

    spyOnLogger = jest.spyOn(logger, 'log');
    spyOnLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    kafkaLogger = KafkaElkLoggerBuilder.build({ loggerBuilder });

    jest.clearAllMocks();
  });

  it('build', async () => {
    kafkaLogger = KafkaElkLoggerBuilder.build({ loggerBuilder, logFields });

    expect(kafkaLogger).toBeDefined();
    expect(spyOnLoggerBuilder).toHaveBeenCalledWith(logFields);

    kafkaLogger(logLevel.ERROR)(entry);

    expect(spyOnLogger).toHaveBeenCalledTimes(1);
    expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.INFO, entry.log.message, {
      payload: entry,
    });

    entry.level = logLevel.ERROR;
    kafkaLogger(logLevel.INFO)(entry);

    expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.ERROR, entry.log.message, {
      payload: entry,
    });
  });

  it('build  with nothing', async () => {
    kafkaLogger = KafkaElkLoggerBuilder.build();

    expect(kafkaLogger).toBeDefined();
    expect(spyOnLoggerBuilder).toHaveBeenCalledTimes(0);

    kafkaLogger(logLevel.INFO)(entry);

    expect(spyOnLogger).toHaveBeenCalledTimes(0);
  });

  it('Call kafka logger', async () => {
    kafkaLogger(entry.level)(entry);

    expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.INFO, entry.log.message, { payload: entry });
  });

  it('Call kafka logger with nothing', async () => {
    entry.level = logLevel.NOTHING;
    kafkaLogger(logLevel.WARN)(entry);

    expect(spyOnLogger).toHaveBeenCalledTimes(0);
  });

  describe('by levels', () => {
    it('NOTHING', async () => {
      entry.level = logLevel.NOTHING;

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledTimes(0);

      entry.level = undefined as unknown as logLevel;

      kafkaLogger(logLevel.INFO)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.INFO, entry.log.message, {
        payload: entry,
      });
    });

    it('use filter', async () => {
      entry.level = logLevel.DEBUG;

      kafkaLogger = KafkaElkLoggerBuilder.build({
        loggerBuilder,
        logFilterParams: [
          {
            namespace: entry.namespace,
          },
        ],
      });

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledTimes(0);
    });

    it('DEBUG', async () => {
      entry.level = logLevel.DEBUG;

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.DEBUG, entry.log.message, {
        payload: entry,
      });

      entry.log = {
        ...entry.log,
        message: '',
      };

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.DEBUG, `Undefined kafka debug`, {
        payload: entry,
      });
    });

    it('INFO', async () => {
      entry.level = logLevel.INFO;

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.INFO, entry.log.message, {
        payload: entry,
      });

      entry.log = {
        ...entry.log,
        message: '',
      };

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.INFO, `Undefined kafka info`, {
        payload: entry,
      });
    });

    it('WARN', async () => {
      entry.level = logLevel.WARN;

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.WARN, entry.log.message, {
        payload: entry,
      });

      entry.log = {
        ...entry.log,
        message: '',
      };

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.WARN, `Undefined kafka warning`, {
        payload: entry,
      });
    });

    it('ERROR', async () => {
      entry.level = logLevel.ERROR;

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.ERROR, entry.log.message, {
        payload: entry,
      });

      entry.log = {
        ...entry.log,
        message: '',
      };

      kafkaLogger(entry.level)(entry);

      expect(spyOnLogger).toHaveBeenCalledWith(LogLevel.ERROR, `Undefined kafka error`, {
        payload: entry,
      });
    });
  });

  describe('kafkaLogFilter', () => {
    it('not use', async () => {
      expect(kafkaLogFilter(entry, [])).toBeFalsy();
    });

    it('filter by namespace', async () => {
      expect(kafkaLogFilter(entry, [{ namespace: entry.namespace }])).toBeTruthy();
      expect(kafkaLogFilter(entry, [{ namespace: faker.string.alpha(3) }])).toBeFalsy();
    });

    it('filter by message', async () => {
      const logFilterParams = [{ namespace: entry.namespace, message: 'Test message' }];

      expect(kafkaLogFilter(entry, logFilterParams)).toBeFalsy();

      entry.log = {
        ...entry.log,
        message: 'Test message',
      };
      expect(kafkaLogFilter(entry, logFilterParams)).toBeTruthy();

      entry.log = {
        ...entry.log,
        message: 'Test message: failed',
      };
      expect(kafkaLogFilter(entry, logFilterParams)).toBeTruthy();

      entry.log = {
        ...entry.log,
        message: 'test message: failed',
      };

      expect(kafkaLogFilter(entry, logFilterParams)).toBeFalsy();
    });
  });
});

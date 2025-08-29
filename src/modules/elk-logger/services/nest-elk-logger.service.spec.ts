import * as fs from 'fs';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { MockEncodeFormatter, MockFormatter, MockRecordEncodeFormatter } from 'tests/modules/elk-logger';
import { TestService } from 'tests/src/test-module';
import { NestElkLoggerService } from './nest-elk-logger.service';
import { ElkLoggerConfig } from './elk-logger.config';
import {
  ELK_DEFAULT_FIELDS_DI,
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_NEST_LOGGER_SERVICE_DI,
  ELK_SORT_FIELDS_DI,
} from '../types/tokens';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { ILogRecordFormatter, IEncodeFormatter, ILogRecordEncodeFormatter, LogLevel } from '../types/elk-logger.types';
import { TraceSpanHelper } from '../helpers/trace-span.helper';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFileSync: jest.fn(),
  openSync: jest.fn(() => 1002),
  writeSync: jest.fn(),
  closeSync: jest.fn(),
}));

describe(NestElkLoggerService.name, () => {
  let mockUuid;
  let spyFormatter;
  let spyRecordEncodeFormatter;
  let spyEncodeFormatter;
  let spyLogWriter;

  let loggerConfig: ElkLoggerConfig;
  let formatter: ILogRecordFormatter;
  let encodeFormatter: IEncodeFormatter;
  let recordEncodeFormatter: ILogRecordEncodeFormatter;
  let formattersFactory: FormattersFactory;
  let recordEncodeFormattersFactory: RecordEncodeFormattersFactory;
  let logger: NestElkLoggerService;

  beforeEach(async () => {
    formatter = new MockFormatter();
    encodeFormatter = new MockEncodeFormatter();
    recordEncodeFormatter = new MockRecordEncodeFormatter();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        {
          provide: ELK_IGNORE_FORMATTER_OBJECTS_DI,
          useValue: [],
        },
        {
          provide: ELK_SORT_FIELDS_DI,
          useValue: [],
        },
        {
          provide: ELK_DEFAULT_FIELDS_DI,
          useValue: {},
        },
        ElkLoggerConfig,
        {
          provide: FormattersFactory,
          useValue: {
            getRecordFormatters: () => [formatter],
            getEncodeFormatters: () => [encodeFormatter],
          },
        },
        {
          provide: RecordEncodeFormattersFactory,
          useValue: {
            getFormatter: () => recordEncodeFormatter,
          },
        },
        {
          provide: ELK_NEST_LOGGER_SERVICE_DI,
          useClass: NestElkLoggerService,
        },
      ],
    }).compile();

    loggerConfig = module.get(ElkLoggerConfig);
    logger = module.get(ELK_NEST_LOGGER_SERVICE_DI);
    formattersFactory = module.get(FormattersFactory);
    recordEncodeFormattersFactory = module.get(RecordEncodeFormattersFactory);

    mockUuid = faker.string.uuid();

    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
    jest.spyOn(DateTimestamp.prototype, 'format').mockImplementation(() => 'timestamp');

    spyFormatter = jest.spyOn(formatter, 'transform');
    spyRecordEncodeFormatter = jest.spyOn(recordEncodeFormatter, 'transform');
    spyEncodeFormatter = jest.spyOn(encodeFormatter, 'transform');
    spyLogWriter = jest.spyOn(process['stdout'], 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(loggerConfig).toBeDefined();
    expect(logger).toBeDefined();
    expect(logger['fileFormatter']).toBeUndefined();
  });

  describe('base logger methods', () => {
    describe('log', () => {
      it('log default', async () => {
        logger.log('Test application successfully started', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'INFO',
          module: 'TestApplication',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with message', async () => {
        logger.log('Test application successfully started');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'INFO',
          module: 'NestElkLoggerService',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with multiple messages', async () => {
        logger.log('message 1', 'message 2', 'message 3', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(3);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(3);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(3);
        expect(spyLogWriter).toHaveBeenCalledTimes(3);
        expect(spyLogWriter).toHaveBeenCalledWith('message 1\n');
        expect(spyLogWriter).toHaveBeenCalledWith('message 2\n');
        expect(spyLogWriter).toHaveBeenCalledWith('message 3\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'INFO',
          module: 'TestApplication',
          message: 'message 3',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with Map object', async () => {
        const map = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        logger.log(map);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Message as object\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            message: map,
          },
          level: 'INFO',
          module: 'NestElkLoggerService',
          message: 'Message as object',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with message and object', async () => {
        const map = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        logger.log('any message', map);

        expect(spyFormatter).toHaveBeenCalledTimes(2);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(2);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(2);
        expect(spyLogWriter).toHaveBeenCalledTimes(2);
        expect(spyLogWriter).toHaveBeenCalledWith('any message\n');
        expect(spyLogWriter).toHaveBeenCalledWith('Message as object\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            message: map,
          },
          level: 'INFO',
          module: 'NestElkLoggerService',
          message: 'Message as object',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with functions for message', async () => {
        logger.log(() => 'Hello World');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Hello World\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'INFO',
          module: 'NestElkLoggerService',
          message: 'Hello World',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('log with class', async () => {
        logger.log(TestService);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith(TestService.name + '\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'INFO',
          module: 'NestElkLoggerService',
          message: TestService.name,
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });
    });

    describe('error', () => {
      it('error default', async () => {
        logger.error('Test application filed', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application filed\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'ERROR',
          module: 'TestApplication',
          message: 'Test application filed',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with stack', async () => {
        const stackTrace = 'Error: message\n    at <anonymous>:1:2';

        logger.error('Test application filed', stackTrace);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application filed\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            errorStack: ['Error: message', 'at <anonymous>:1:2'],
          },
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Test application filed',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with message', async () => {
        logger.error('Test application filed');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application filed\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Test application filed',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with message and undefined', async () => {
        logger.error('Test application filed', undefined);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application filed\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Test application filed',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with Error', async () => {
        const error = new Error('Test error');

        logger.error(error);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test error\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            error,
          },
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Test error',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with Error as IKeyValue', async () => {
        const error = {
          isRandomError: true,
        };

        logger.error(error);

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Message as object\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            isRandomError: true,
          },
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Message as object',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with message, stack and context', async () => {
        logger.error('Test application filed', 'anyStackTrace', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application filed\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            errorStack: ['anyStackTrace'],
          },
          level: 'ERROR',
          module: 'TestApplication',
          message: 'Test application filed',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with multiple messages, stack and context', async () => {
        logger.error('message 1', 'message 2', 'anyStackTrace', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(2);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(2);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(2);
        expect(spyLogWriter).toHaveBeenCalledTimes(2);
        expect(spyLogWriter).toHaveBeenCalledWith('message 1\n');
        expect(spyLogWriter).toHaveBeenCalledWith('message 2\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            errorStack: ['anyStackTrace'],
          },
          level: 'ERROR',
          module: 'TestApplication',
          message: 'message 2',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with messages and object', async () => {
        const error = {
          isRandomError: true,
        };

        logger.error('message 1', 'message 2', error);

        expect(spyFormatter).toHaveBeenCalledTimes(3);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(3);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(3);
        expect(spyLogWriter).toHaveBeenCalledTimes(3);
        expect(spyLogWriter).toHaveBeenCalledWith('message 1\n');
        expect(spyLogWriter).toHaveBeenCalledWith('message 2\n');
        expect(spyLogWriter).toHaveBeenCalledWith('Message as object\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            isRandomError: true,
          },
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Message as object',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('error with Error and stack', async () => {
        const error = new Error('Test error');
        const stackTrace = 'Error: message\n    at <anonymous>:1:2';

        logger.error(error, stackTrace);
        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test error\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {
            error,
            errorStack: ['Error: message', 'at <anonymous>:1:2'],
          },
          level: 'ERROR',
          module: 'NestElkLoggerService',
          message: 'Test error',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });
    });

    describe('other logging methods', () => {
      it('warn', async () => {
        logger.warn('Test application successfully started', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'WARN',
          module: 'TestApplication',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('debug', async () => {
        logger.debug('Test application successfully started', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'DEBUG',
          module: 'TestApplication',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('verbose', async () => {
        logger.verbose('Test application successfully started', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'DEBUG',
          module: 'TestApplication',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });

      it('fatal', async () => {
        logger.fatal('Test application successfully started', 'TestApplication');

        expect(spyFormatter).toHaveBeenCalledTimes(1);
        expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledTimes(1);
        expect(spyLogWriter).toHaveBeenCalledWith('Test application successfully started\n');
        expect(logger.getLastLogRecord()).toEqual({
          markers: [],
          businessData: {},
          payload: {},
          level: 'FATAL',
          module: 'TestApplication',
          message: 'Test application successfully started',
          traceId: mockUuid,
          spanId: mockUuid,
          parentSpanId: '',
          timestamp: 'timestamp',
        });
      });
    });
  });

  describe('other methods', () => {
    let spyOnOpenSync;
    let spyOnAppendFileSync;

    beforeEach(async () => {
      loggerConfig = new ElkLoggerConfig(
        new MockConfigService({
          LOGGER_FORMAT_RECORD: 'SHORT',
          LOGGER_STORE_FILE: 'log.log',
        }) as undefined as ConfigService,
        [],
        [],
      );

      logger = new NestElkLoggerService(loggerConfig, recordEncodeFormattersFactory, formattersFactory);

      spyOnOpenSync = jest.spyOn(fs, 'openSync');
      spyOnAppendFileSync = jest.spyOn(fs, 'appendFileSync');
    });

    it('setLogLevels', async () => {
      expect(loggerConfig.getFileDescriptor()).toEqual(1002);
      expect(spyOnOpenSync).toHaveBeenCalledTimes(1);

      expect(logger['fileFormatter']).toBeDefined();

      const spyFileFormatter = jest
        .spyOn(logger['fileFormatter'], 'transform')
        .mockImplementation((from) => from.module);

      logger.setLogLevels(['verbose', 'warn']);

      expect(loggerConfig.getLogLevels()).toEqual([LogLevel.DEBUG, LogLevel.WARN]);

      logger.log('any message');

      expect(spyLogWriter).toHaveBeenCalledTimes(0);
      expect(spyOnAppendFileSync).toHaveBeenCalledTimes(0);

      logger.setLogLevels(['log']);

      expect(loggerConfig.getLogLevels()).toEqual([LogLevel.INFO]);

      logger.log('any message');

      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyFileFormatter).toHaveBeenCalledTimes(1);
      expect(spyFileFormatter).toHaveBeenCalledWith({
        markers: [],
        businessData: {},
        payload: {},
        level: 'INFO',
        module: 'NestElkLoggerService',
        message: 'any message',
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
      expect(spyOnAppendFileSync).toHaveBeenCalledTimes(1);
      expect(spyOnAppendFileSync).toHaveBeenCalledWith(1002, 'NestElkLoggerService', 'utf8');
    });
  });
});

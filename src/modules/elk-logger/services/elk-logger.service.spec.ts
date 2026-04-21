import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { CheckObjectsType, LoggerMarkers } from 'src/modules/common';
import { MockConfigService } from 'tests/nestjs';
import { MockEncodeFormatter, MockFormatter, MockRecordEncodeFormatter } from 'tests/modules/elk-logger';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import {
  IEncodeFormatter,
  ILogFields,
  ILogRecordEncodeFormatter,
  ILogRecordFormatter,
  LogLevel,
} from '../types/elk-logger.types';
import { ElkLoggerConfig } from './elk-logger.config';
import { ElkLoggerService } from './elk-logger.service';
import {
  ELK_DEFAULT_FIELDS_DI,
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_LOGGER_SERVICE_DI,
  ELK_OBJECT_FORMATTERS_DI,
  ELK_SORT_FIELDS_DI,
} from '../types/tokens';
import { TraceSpanHelper } from '../helpers/trace-span.helper';
import { BaseObjectFormatter } from '../formatters/objects/base.object-formatter';
import { ProcessTraceSpanStore } from './process-trace-span.store';

describe(ElkLoggerService.name, () => {
  let mockUuid: string;
  let spyFormatter: jest.SpyInstance;
  let spyRecordEncodeFormatter: jest.SpyInstance;
  let spyEncodeFormatter: jest.SpyInstance;
  let spyLogWriter: jest.SpyInstance;

  let loggerConfig: ElkLoggerConfig;
  let formatter: ILogRecordFormatter;
  let encodeFormatter: IEncodeFormatter;
  let recordEncodeFormatter: ILogRecordEncodeFormatter;
  let logger: ElkLoggerService;

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
          provide: ELK_OBJECT_FORMATTERS_DI,
          useValue: [],
        },
        {
          provide: ELK_SORT_FIELDS_DI,
          useValue: [],
        },
        {
          provide: ELK_DEFAULT_FIELDS_DI,
          useValue: {
            module: 'TestApplication',
            index: 'Test Application',
            markers: ['test'],
            businessData: {
              user: 'User Name',
            },
          },
        },
        {
          provide: ElkLoggerConfig,
          inject: [
            ConfigService,
            ELK_IGNORE_FORMATTER_OBJECTS_DI,
            ELK_OBJECT_FORMATTERS_DI,
            ELK_SORT_FIELDS_DI,
            ELK_DEFAULT_FIELDS_DI,
          ],
          useFactory: (
            configService: ConfigService,
            ignoreObjects: CheckObjectsType[],
            objectFormatters: BaseObjectFormatter[],
            sortFields: string[],
            defaultFields?: ILogFields,
          ) => {
            return new ElkLoggerConfig(
              configService,
              [...ignoreObjects, ...objectFormatters] as CheckObjectsType[],
              sortFields,
              defaultFields,
            );
          },
        },
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
          provide: ELK_LOGGER_SERVICE_DI,
          useClass: ElkLoggerService,
        },
      ],
    }).compile();

    loggerConfig = module.get(ElkLoggerConfig);
    logger = module.get(ELK_LOGGER_SERVICE_DI);

    mockUuid = faker.string.uuid();

    ProcessTraceSpanStore.instance.reset();
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
  });

  describe('base logger methods', () => {
    it('log', async () => {
      const traceId = faker.string.uuid();

      logger.log(LogLevel.DEBUG, 'start process', {
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        traceId,
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'DEBUG',
        module: 'TestApplication',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: traceId,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('trace', async () => {
      logger.trace('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'TRACE',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('debug', async () => {
      logger.debug('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'DEBUG',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('info', async () => {
      logger.info('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'INFO',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('warn', async () => {
      logger.warn('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'WARN',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('error', async () => {
      logger.error('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'ERROR',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });

    it('fatal', async () => {
      logger.fatal('start process', {
        module: 'TestService',
        markers: [LoggerMarkers.SUCCESS],
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'FATAL',
        module: 'TestApplication.TestService',
        index: 'Test Application',
        markers: ['test', LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: mockUuid,
        spanId: mockUuid,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });
  });

  describe('other methods', () => {
    it('addDefaultLogFields calls merge when defaults already set', async () => {
      logger.addDefaultLogFields({ module: 'First' } as ILogFields);
      logger.addDefaultLogFields({ index: 'Second' } as ILogFields);
      expect(logger['defaultLogFields']).toBeDefined();
    });

    it('addDefaultLogFields falls back to filterMarkers when defaults are empty', async () => {
      logger['defaultLogFields'] = undefined as unknown as ILogFields;
      logger.addDefaultLogFields({
        module: 'Fresh',
        markers: [LoggerMarkers.INTERNAL],
      } as ILogFields);

      expect(logger['defaultLogFields']).toEqual({
        module: 'Fresh',
        markers: [LoggerMarkers.INTERNAL],
      });
    });

    it('addDefaultLogFields', async () => {
      const traceId = faker.string.uuid();
      const spanId = faker.string.uuid();
      logger.addDefaultLogFields({
        module: 'TestService',
        index: 'Test Service',
        markers: [LoggerMarkers.INTERNAL],
        spanId,
        businessData: {
          user: 'New User Name',
        },
      } as ILogFields);

      logger.info('start process', {
        module: 'init',
        markers: [LoggerMarkers.SUCCESS],
        traceId,
        businessData: {
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
      });

      expect(spyFormatter).toHaveBeenCalledTimes(1);
      expect(spyRecordEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyEncodeFormatter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledTimes(1);
      expect(spyLogWriter).toHaveBeenCalledWith('start process\n');
      expect(logger.getLastLogRecord()).toEqual({
        level: 'INFO',
        module: 'TestApplication.TestService.init',
        index: 'Test Service',
        markers: ['test', LoggerMarkers.INTERNAL, LoggerMarkers.SUCCESS],
        message: 'start process',
        businessData: {
          user: 'New User Name',
          address: 'User Address',
        },
        payload: {
          status: 'run',
        },
        traceId: traceId,
        spanId: spanId,
        parentSpanId: '',
        timestamp: 'timestamp',
      });
    });
  });

  it('Filter by level', async () => {
    loggerConfig['logLevels'] = [LogLevel.DEBUG];

    logger.info('start process');
    logger.log(LogLevel.INFO, 'start process');

    expect(spyLogWriter).toHaveBeenCalledTimes(0);

    loggerConfig['logLevels'] = [LogLevel.INFO];

    logger.info('start process');
    logger.log(LogLevel.INFO, 'start process');

    expect(spyLogWriter).toHaveBeenCalledTimes(2);
  });

  it('keeps explicit trace ids and preserves parentSpanId distinct from spanId', async () => {
    const traceId = faker.string.uuid();
    const spanId = faker.string.uuid();
    const parentSpanId = faker.string.uuid();

    logger.info('start process', {
      module: 'TestService',
      traceId,
      spanId,
      parentSpanId,
    });

    expect(logger.getLastLogRecord()).toMatchObject({
      traceId,
      spanId,
      parentSpanId,
    });
  });

  it('falls back to ProcessTraceSpanStore for trace ids when nothing is provided', async () => {
    const fallbackTraceId = faker.string.uuid();
    const fallbackSpanId = faker.string.uuid();

    const spyOnFallback = jest.spyOn(ProcessTraceSpanStore.instance, 'get').mockImplementation(() => ({
      traceId: fallbackTraceId,
      spanId: fallbackSpanId,
      parentSpanId: fallbackSpanId,
    }));

    try {
      logger.info('start process', { module: 'TestService' });

      expect(logger.getLastLogRecord()).toMatchObject({
        traceId: fallbackTraceId,
        spanId: fallbackSpanId,
        parentSpanId: '',
      });
    } finally {
      spyOnFallback.mockRestore();
    }
  });

  it('Filter by module', async () => {
    loggerConfig['ignoreModules'] = ['TestApplication.TestService'];

    logger.info('start process', {
      module: 'TestService',
    });

    logger.log(LogLevel.DEBUG, 'start process');

    expect(spyLogWriter).toHaveBeenCalledTimes(1);

    expect(logger.getLastLogRecord()).toEqual({
      level: 'DEBUG',
      module: 'TestApplication',
      index: 'Test Application',
      markers: ['test'],
      message: 'start process',
      businessData: {
        user: 'User Name',
      },
      payload: {},
      traceId: mockUuid,
      spanId: mockUuid,
      parentSpanId: '',
      timestamp: 'timestamp',
    });
  });
});

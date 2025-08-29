import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { MomentCheckObject } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { ElkLoggerConfig } from './elk-logger.config';
import { ILogFields, LogFormat, LogLevel } from '../types/elk-logger.types';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFileSync: jest.fn(),
  openSync: jest.fn(() => 1002),
  writeSync: jest.fn(),
  closeSync: jest.fn(),
}));

describe(ElkLoggerConfig.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;

  beforeEach(async () => {
    configService = undefined;
    loggerConfig = undefined;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('default', async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);

    expect({
      getDefaultFields: loggerConfig.getDefaultFields(),
      getFileDescriptor: loggerConfig.getFileDescriptor(),
      getFormatLogRecord: loggerConfig.getFormatLogRecord(),
      getIgnoreModules: loggerConfig.getIgnoreModules(),
      getLogLevels: loggerConfig.getLogLevels(),
      getTimestampFormat: loggerConfig.getTimestampFormat(),
      getIgnoreObjects: loggerConfig.getIgnoreObjects(),
      getSortFields: loggerConfig.getSortFields(),
    }).toEqual({
      getDefaultFields: {},
      getFileDescriptor: undefined,
      getFormatLogRecord: LogFormat.FULL,
      getIgnoreModules: [],
      getLogLevels: [],
      getTimestampFormat: 'YYYY-MM-DD[T]HH:mm:ssZ',
      getIgnoreObjects: [Error, DateTimestamp, MomentCheckObject],
      getSortFields: [],
    });
  });

  it('custom', async () => {
    const spyOnOpenSync = jest.spyOn(fs, 'openSync');

    configService = new MockConfigService({
      LOGGER_FORMAT_RECORD: 'SHORT',
      LOGGER_IGNORE_MODULES: 'app,NestApplication',
      LOGGER_LEVELS: 'INFO,WARN',
      LOGGER_FORMAT_TIMESTAMP: 'DD.MM.YYYY HH:mm:ss.SSS',
      LOGGER_STORE_FILE: 'log.log',
    }) as undefined as ConfigService;

    loggerConfig = new ElkLoggerConfig(configService, [], ['timestamp', 'traceId', 'message'], {
      index: 'TestApplication',
    } as ILogFields);

    expect(spyOnOpenSync).toHaveBeenCalledWith('log.log', 'a');

    expect({
      getDefaultFields: loggerConfig.getDefaultFields(),
      getFileDescriptor: loggerConfig.getFileDescriptor(),
      getFormatLogRecord: loggerConfig.getFormatLogRecord(),
      getIgnoreModules: loggerConfig.getIgnoreModules(),
      getLogLevels: loggerConfig.getLogLevels(),
      getTimestampFormat: loggerConfig.getTimestampFormat(),
      getIgnoreObjects: loggerConfig.getIgnoreObjects(),
      getSortFields: loggerConfig.getSortFields(),
    }).toEqual({
      getDefaultFields: {
        index: 'TestApplication',
      },
      getFileDescriptor: 1002,
      getFormatLogRecord: LogFormat.SHORT,
      getIgnoreModules: ['app', 'NestApplication'],
      getLogLevels: [LogLevel.INFO, LogLevel.WARN],
      getTimestampFormat: 'DD.MM.YYYY HH:mm:ss.SSS',
      getIgnoreObjects: [Error, DateTimestamp, MomentCheckObject],
      getSortFields: ['timestamp', 'traceId', 'message'],
    });
  });

  it('setLogLevels', async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);

    loggerConfig.setLogLevels([LogLevel.INFO, LogLevel.WARN]);

    expect(loggerConfig.getLogLevels()).toEqual([LogLevel.INFO, LogLevel.WARN]);
  });

  it('isIgnoreObject', async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);

    expect(loggerConfig.isIgnoreObject({})).toBeTruthy();
    expect(loggerConfig.isIgnoreObject(new DateTimestamp())).toBeTruthy();
    expect(loggerConfig.isIgnoreObject(new Error('Test Error'))).toBeTruthy();
  });
});

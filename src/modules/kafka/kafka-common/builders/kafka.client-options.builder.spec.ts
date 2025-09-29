import { faker } from '@faker-js/faker';
import { logLevel } from 'kafkajs';
import { UrlHelper } from 'src/modules/common';
import { IElkLoggerService, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { IKafkaClientOptions } from '../types/types';
import { KafkaClientOptionsBuilder } from './kafka.client-options.builder';
import { KafkaElkLoggerBuilder } from './kafka.ekf-logger.builder';

describe(KafkaClientOptionsBuilder.name, () => {
  let spyLog;
  let mockHost: string;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logFields: ILogFields;
  let options: IKafkaClientOptions;

  beforeEach(async () => {
    mockHost = faker.string.alpha(10);

    jest.spyOn(UrlHelper, 'normalize').mockImplementation(() => mockHost);
    spyLog = jest.spyOn(KafkaElkLoggerBuilder, 'build');

    logger = new MockElkLoggerService();
    loggerBuilder = {
      build: () => logger,
    };

    logFields = {
      module: 'TestService',
    };

    options = {
      brokers: [faker.string.alpha(10)],
      normalizeUrl: true,
      useLogger: true,
      retry: {
        timeout: faker.number.int(),
        delay: faker.number.int(),
        retryMaxCount: faker.number.int(),
      },
      clientId: faker.string.alpha(10),
    };

    jest.clearAllMocks();
  });

  it('build default', async () => {
    const optionsTgt = KafkaClientOptionsBuilder.build(options, {
      loggerBuilder,
      logFields,
    });

    expect({
      ...optionsTgt,
      logCreator: undefined,
    }).toEqual({
      ...options,
      brokers: [mockHost],
      normalizeUrl: undefined,
      useLogger: undefined,
      retry: undefined,
      logLevel: logLevel.INFO,
    });
    expect(typeof optionsTgt.logCreator).toBe('function');
    expect(spyLog).toHaveBeenCalledWith({
      loggerBuilder,
      logFields,
    });
  });

  it('build with raw brokers', async () => {
    options.normalizeUrl = false;
    const optionsTgt = KafkaClientOptionsBuilder.build(options, {
      loggerBuilder,
      logFields,
    });

    expect(optionsTgt.brokers).toEqual(options.brokers);
  });

  it('build without logger', async () => {
    options.useLogger = false;
    const optionsTgt = KafkaClientOptionsBuilder.build(options);

    expect(optionsTgt.logLevel).toBe(logLevel.NOTHING);
    expect(typeof optionsTgt.logCreator).toBe('function');
    expect(spyLog).toHaveBeenCalledWith();
  });

  it('build failed broker', async () => {
    jest.spyOn(UrlHelper, 'normalize').mockImplementation(() => false);

    expect(() => KafkaClientOptionsBuilder.build(options)).toThrow(`Не корректный формат url (${options.brokers[0]})`);
  });

  it('build failed loggerBuilder', async () => {
    expect(() => KafkaClientOptionsBuilder.build(options)).toThrow(
      'KafkaClientOptionsBuilder: loggerBuilder должно быть задан, если включена опция useLogger.',
    );
  });
});

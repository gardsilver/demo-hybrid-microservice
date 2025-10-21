import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import { MockConfigService } from 'tests/nestjs';
import { PruneEncoder } from './prune.encoder';
import {
  ELK_DEFAULT_FIELDS_DI,
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_OBJECT_FORMATTERS_DI,
  ELK_SORT_FIELDS_DI,
} from '../../types/tokens';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { PruneConfig } from '../prune.config';
import { ILogFields, LogFormat } from '../../types/elk-logger.types';
import { PruneMessages } from '../../types/prune.types';
import { CheckObjectsType } from 'src/modules/common';
import { ObjectFormatter } from '../records/object.formatter';

describe(PruneEncoder.name, () => {
  let loggerConfig: ElkLoggerConfig;
  let pruneConfig: PruneConfig;
  let encoder: PruneEncoder;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({
            LOGGER_FORMAT_RECORD: 'SHORT',
          }),
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
            index: 'MyApplications',
            markers: ['test'],
            businessData: {
              server: 'TestServer',
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
            objectFormatters: ObjectFormatter[],
            sortFields: string[],
            defaultFields?: ILogFields,
          ) => {
            return new ElkLoggerConfig(
              configService,
              [].concat(ignoreObjects, objectFormatters),
              sortFields,
              defaultFields,
            );
          },
        },
        PruneConfig,
        PruneEncoder,
      ],
    }).compile();

    loggerConfig = module.get(ElkLoggerConfig);
    pruneConfig = module.get(PruneConfig);
    encoder = module.get(PruneEncoder);
  });

  it('init', async () => {
    expect(loggerConfig).toBeDefined();
    expect(pruneConfig).toBeDefined();
    expect(encoder).toBeDefined();
    expect(loggerConfig.getFormatLogRecord()).toBe(LogFormat.SHORT);
    expect(pruneConfig.getMaxLengthPruneEncoder()).toBe(Infinity);
  });

  it('off', async () => {
    const test = faker.string.sample(20);

    expect(encoder.transform(test)).toBe(test);
    expect(test.length).toBe(20);
  });

  it('apply', async () => {
    jest.spyOn(pruneConfig, 'getMaxLengthPruneEncoder').mockImplementation(() => 10);

    const test = faker.string.sample(20);

    expect(encoder.transform(test)).toBe(test.slice(0, 10) + PruneMessages.LIMIT_LENGTH);
    expect(test.length).toBe(20);
  });
});

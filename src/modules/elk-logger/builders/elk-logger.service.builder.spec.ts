import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockEncodeFormatter, MockFormatter } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { ElkLoggerServiceBuilder } from './elk-logger.service.builder';
import { ObjectFormatterBuilder } from './object-formatter.builder';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { FullFormatter } from '../formatters/record-encodes/full.formatter';
import { SimpleFormatter } from '../formatters/record-encodes/simple.formatter';
import { ShortFormatter } from '../formatters/record-encodes/short.formatter';
import { FormattersFactory } from '../formatters/formatters.factory';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import {
  ELK_DEFAULT_FIELDS_DI,
  ELK_FEATURE_ENCODERS_DI,
  ELK_FEATURE_FORMATTERS_DI,
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_SORT_FIELDS_DI,
} from '../types/tokens';
import { CircularFormatter } from '../formatters/records/circular.formatter';
import { ObjectFormatter } from '../formatters/records/object.formatter';
import { PruneFormatter } from '../formatters/records/prune.formatter';
import { PruneConfig } from '../formatters/prune.config';
import { SortFieldsFormatter } from '../formatters/records/sort-fields.formatter';
import { ElkLoggerService } from '../services/elk-logger.service';
import { PruneEncoder } from '../formatters/encodes/prune.encoder';
import { TraceSpanHelper } from '../helpers/trace-span.helper';
import { ILogFields } from '../types/elk-logger.types';

describe(ElkLoggerServiceBuilder.name, () => {
  let mockUuid;
  let loggerBuilder: ElkLoggerServiceBuilder;

  beforeAll(async () => {
    mockUuid = randomUUID();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);

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
          useValue: {
            index: 'MyApplications',
            markers: ['test'],
            businessData: {
              server: 'TestServer',
            },
          },
        },
        ElkLoggerConfig,
        PruneConfig,
        FullFormatter,
        SimpleFormatter,
        ShortFormatter,
        PruneEncoder,
        RecordEncodeFormattersFactory,
        CircularFormatter,
        {
          provide: ObjectFormatter,
          useFactory: () => {
            return ObjectFormatterBuilder.build();
          },
        },
        PruneFormatter,
        SortFieldsFormatter,
        {
          provide: ELK_FEATURE_FORMATTERS_DI,
          useValue: [new MockFormatter()],
        },
        {
          provide: ELK_FEATURE_ENCODERS_DI,
          useValue: [new MockEncodeFormatter()],
        },
        FormattersFactory,
        ElkLoggerServiceBuilder,
      ],
    }).compile();

    loggerBuilder = module.get(ElkLoggerServiceBuilder);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('default', async () => {
    expect(loggerBuilder).toBeDefined();
  });

  it('default', async () => {
    const logger = loggerBuilder.build();

    expect(logger).toBeDefined();
    expect(logger instanceof ElkLoggerService).toBeTruthy();
    expect(logger['defaultLogFields']).toEqual({
      traceId: mockUuid,
      index: 'MyApplications',
      markers: ['test'],
      businessData: {
        server: 'TestServer',
      },
      payload: {},
    });
  });

  it('custom', async () => {
    const logger = loggerBuilder.build({
      index: 'TestApplications',
      markers: ['request'],
      businessData: {
        subModule: 'SubModule',
      },
    } as ILogFields);

    expect(logger).toBeDefined();
    expect(logger instanceof ElkLoggerService).toBeTruthy();
    expect(logger['defaultLogFields']).toEqual({
      traceId: mockUuid,
      index: 'TestApplications',
      markers: ['test', 'request'],
      businessData: {
        server: 'TestServer',
        subModule: 'SubModule',
      },
      payload: {},
    });
  });
});

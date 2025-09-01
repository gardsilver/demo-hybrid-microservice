import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { MockEncodeFormatter, MockFormatter } from 'tests/modules/elk-logger';
import { ObjectFormatterBuilder } from '../builders/object-formatter.builder';
import { FormattersFactory } from '../formatters/formatters.factory';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { CircularFormatter } from '../formatters/records/circular.formatter';
import { ObjectFormatter } from './records/object.formatter';
import { PruneFormatter } from '../formatters/records/prune.formatter';
import { SortFieldsFormatter } from '../formatters/records/sort-fields.formatter';
import { PruneEncoder } from '../formatters/encodes/prune.encoder';
import { PruneConfig } from './prune.config';
import {
  ELK_DEFAULT_FIELDS_DI,
  ELK_FEATURE_ENCODERS_DI,
  ELK_FEATURE_FORMATTERS_DI,
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_SORT_FIELDS_DI,
} from '../types/tokens';

describe(FormattersFactory.name, () => {
  let formattersFactory: FormattersFactory;

  beforeEach(async () => {
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
        PruneConfig,
        {
          provide: ELK_FEATURE_FORMATTERS_DI,
          useValue: [new MockFormatter()],
        },
        {
          provide: ELK_FEATURE_ENCODERS_DI,
          useValue: [new MockEncodeFormatter()],
        },
        CircularFormatter,
        {
          provide: ObjectFormatter,
          inject: [ElkLoggerConfig],
          useFactory: (loggerConfig: ElkLoggerConfig) => {
            return ObjectFormatterBuilder.build(loggerConfig);
          },
        },
        PruneFormatter,
        SortFieldsFormatter,
        PruneEncoder,
        FormattersFactory,
      ],
    }).compile();

    formattersFactory = module.get(FormattersFactory);
  });

  it('init', async () => {
    expect(formattersFactory).toBeDefined();
  });

  it('custom', async () => {
    const formatters = formattersFactory.getRecordFormatters();

    expect(formatters.length).toEqual(5);
    expect(formatters[0] instanceof CircularFormatter).toBeTruthy();
    expect(formatters[1] instanceof ObjectFormatter).toBeTruthy();
    expect(formatters[2] instanceof MockFormatter).toBeTruthy();
    expect(formatters[3] instanceof PruneFormatter).toBeTruthy();
    expect(formatters[4] instanceof SortFieldsFormatter).toBeTruthy();

    const encodeFormatters = formattersFactory.getEncodeFormatters();

    expect(encodeFormatters.length).toEqual(2);
    expect(encodeFormatters[0] instanceof MockEncodeFormatter).toBeTruthy();
    expect(encodeFormatters[1] instanceof PruneEncoder).toBeTruthy();
  });
});

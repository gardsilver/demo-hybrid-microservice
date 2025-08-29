import { ConfigService } from '@nestjs/config';
import { IEncodeFormatter, ILogRecordFormatter, INestElkLoggerService } from '../types/elk-logger.types';
import { IElkLoggerModuleOptions } from '../types/elk-logger.module.options';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { NestElkLoggerService } from '../services/nest-elk-logger.service';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { FullFormatter } from '../formatters/record-encodes/full.formatter';
import { SimpleFormatter } from '../formatters/record-encodes/simple.formatter';
import { ShortFormatter } from '../formatters/record-encodes/short.formatter';
import { PruneConfig } from '../formatters/prune.config';
import { PruneEncoder } from '../formatters/encodes/prune.encoder';
import { CircularFormatter } from '../formatters/records/circular.formatter';
import { PruneFormatter } from '../formatters/records/prune.formatter';
import { SortFieldsFormatter } from '../formatters/records/sort-fields.formatter';
import { ObjectFormatterBuilder } from './object-formatter.builder';

export interface INestElkLoggerServiceBuilderOption
  extends Pick<IElkLoggerModuleOptions, 'defaultFields' | 'formattersOptions'> {
  configService?: ConfigService;
  formatters?: ILogRecordFormatter[];
  encoders?: IEncodeFormatter[];
}

export class NestElkLoggerServiceBuilder {
  public static build(options?: INestElkLoggerServiceBuilderOption): INestElkLoggerService {
    const { elkLoggerConfig, recordEncodeFormattersFactory, formattersFactory } =
      NestElkLoggerServiceBuilder.buildService({
        ...options,
        configService: options?.configService ?? new ConfigService(),
      });

    return new NestElkLoggerService(elkLoggerConfig, recordEncodeFormattersFactory, formattersFactory);
  }

  private static buildService(options: INestElkLoggerServiceBuilderOption): {
    elkLoggerConfig: ElkLoggerConfig;
    recordEncodeFormattersFactory: RecordEncodeFormattersFactory;
    formattersFactory: FormattersFactory;
  } {
    const elkLoggerConfig = new ElkLoggerConfig(
      options.configService,
      options?.formattersOptions?.ignoreObjects?.length ? options?.formattersOptions?.ignoreObjects : [],
      options?.formattersOptions?.sortFields?.length ? options?.formattersOptions?.sortFields : [],
      options?.defaultFields,
    );
    const pruneConfig = new PruneConfig(options.configService, elkLoggerConfig);
    const formattersFactory = new FormattersFactory(
      new CircularFormatter(elkLoggerConfig),
      ObjectFormatterBuilder.build(options?.formattersOptions),
      new PruneFormatter(pruneConfig),
      new SortFieldsFormatter(elkLoggerConfig),
      new PruneEncoder(pruneConfig),
      options?.formatters ?? [],
      options?.encoders ?? [],
    );
    const recordEncodeFormattersFactory = new RecordEncodeFormattersFactory(
      new FullFormatter(),
      new SimpleFormatter(),
      new ShortFormatter(),
    );

    return {
      elkLoggerConfig,
      formattersFactory,
      recordEncodeFormattersFactory,
    };
  }
}

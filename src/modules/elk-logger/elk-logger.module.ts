import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CheckObjectsType, ImportsType, ProviderBuilder } from 'src/modules/common';
import {
  ELK_IGNORE_FORMATTER_OBJECTS_DI,
  ELK_SORT_FIELDS_DI,
  ELK_DEFAULT_FIELDS_DI,
  ELK_NEST_LOGGER_SERVICE_DI,
  ELK_LOGGER_SERVICE_DI,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ELK_FEATURE_FORMATTERS_DI,
  ELK_FEATURE_ENCODERS_DI,
  ELK_OBJECT_FORMATTERS_DI,
  ELK_EXCEPTION_FORMATTER_OBJECTS_DI,
} from './types/tokens';
import { IElkLoggerModuleOptions } from './types/elk-logger.module.options';
import { ElkLoggerConfig } from './services/elk-logger.config';
import { PruneConfig } from './formatters/prune.config';
import { ShortFormatter } from './formatters/record-encodes/short.formatter';
import { SimpleFormatter } from './formatters/record-encodes/simple.formatter';
import { FileFormatter } from './formatters/record-encodes/file.formatter';
import { FullFormatter } from './formatters/record-encodes/full.formatter';
import { PruneEncoder } from './formatters/encodes/prune.encoder';
import { CircularFormatter } from './formatters/records/circular.formatter';
import { ObjectFormatter as RecordObjectFormatter } from './formatters/records/object.formatter';
import { PruneFormatter } from './formatters/records/prune.formatter';
import { SortFieldsFormatter } from './formatters/records/sort-fields.formatter';
import { FormattersFactory } from './formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from './formatters/record-encode.formatters.factory';
import { ElkLoggerService } from './services/elk-logger.service';
import { NestElkLoggerService } from './services/nest-elk-logger.service';
import { ElkLoggerServiceBuilder } from './builders/elk-logger.service.builder';
import { ObjectFormatterBuilder } from './builders/object-formatter.builder';
import { ILogFields } from './types/elk-logger.types';
import { ElkLoggerEventService } from './services/elk-logger.event-service';
import { BaseErrorObjectFormatter } from './formatters/objects/base-error.object-formatter';
import { BaseObjectFormatter } from './formatters/objects/base.object-formatter';

@Module({})
export class ElkLoggerModule {
  public static forRoot(options?: IElkLoggerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    let providers: Provider[] = [
      ProviderBuilder.build(ELK_IGNORE_FORMATTER_OBJECTS_DI, {
        providerType: options?.formattersOptions?.ignoreObjects,
        defaultType: { useValue: [] },
      }),
      ProviderBuilder.build(ELK_EXCEPTION_FORMATTER_OBJECTS_DI, {
        providerType: options?.formattersOptions?.exceptionFormatters,
        defaultType: { useValue: [] },
      }),
      ProviderBuilder.build(ELK_OBJECT_FORMATTERS_DI, {
        providerType: options?.formattersOptions?.objectFormatters,
        defaultType: { useValue: [] },
      }),
      {
        provide: ELK_SORT_FIELDS_DI,
        useValue: options?.formattersOptions?.sortFields?.length ? options.formattersOptions.sortFields : [],
      },
      {
        provide: ELK_DEFAULT_FIELDS_DI,
        useValue: options?.defaultFields,
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
            [].concat(ignoreObjects, objectFormatters),
            sortFields,
            defaultFields,
          );
        },
      },
      PruneConfig,
      FileFormatter,
      ShortFormatter,
      SimpleFormatter,
      FullFormatter,
      PruneEncoder,
      CircularFormatter,
      {
        provide: RecordObjectFormatter,
        inject: [ElkLoggerConfig, ELK_EXCEPTION_FORMATTER_OBJECTS_DI, ELK_OBJECT_FORMATTERS_DI],
        useFactory: (
          elkLoggerConfig: ElkLoggerConfig,
          exceptionFormatters: BaseErrorObjectFormatter[],
          objectFormatters: BaseObjectFormatter[],
        ) => {
          return ObjectFormatterBuilder.build(elkLoggerConfig, {
            exceptionFormatters,
            objectFormatters,
          });
        },
      },
      PruneFormatter,
      SortFieldsFormatter,
      FormattersFactory,
      RecordEncodeFormattersFactory,
      {
        provide: ELK_LOGGER_SERVICE_DI,
        useClass: ElkLoggerService,
      },
      {
        provide: ELK_NEST_LOGGER_SERVICE_DI,
        useClass: NestElkLoggerService,
      },
      {
        provide: ELK_LOGGER_SERVICE_BUILDER_DI,
        useClass: ElkLoggerServiceBuilder,
      },
      ProviderBuilder.build(ELK_FEATURE_FORMATTERS_DI, {
        providerType: options?.formatters,
        defaultType: { useValue: [] },
      }),
      ProviderBuilder.build(ELK_FEATURE_ENCODERS_DI, {
        providerType: options?.encoders,
        defaultType: { useValue: [] },
      }),
      ElkLoggerEventService,
    ];

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: ElkLoggerModule,
      global: true,
      imports,
      providers,
      exports: [
        ElkLoggerConfig,
        PruneConfig,
        ELK_LOGGER_SERVICE_DI,
        ELK_NEST_LOGGER_SERVICE_DI,
        ELK_LOGGER_SERVICE_BUILDER_DI,
      ],
    };
  }
}

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { IRabbitMqPublishOptionsBuilder, RabbitMqPublishOptionsBuilder } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IRabbitMqClientModuleOptions, IRabbitMqClientOptions } from './types/types';
import {
  RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
  RABBIT_MQ_CLIENT_PROXY_DI,
  RABBIT_MQ_CLIENT_PROXY_OPTIONS_DI,
  RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI,
} from './types/tokens';
import { ProducerSerializer } from './adapters/producer.serializer';
import { RabbitMqClientProxy } from './services/rabbit-mq-client.proxy';
import { RabbitMqClientService } from './services/rabbit-mq-client.service';
import { RabbitMqClientErrorHandler } from './filters/rabbit-mq-client.error-handler';

@Module({})
export class RabbitMqClientModule {
  public static register(options: IRabbitMqClientModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    let providers: Provider[] = [
      ProviderBuilder.build(RABBIT_MQ_CLIENT_PROXY_OPTIONS_DI, {
        providerType: options.clientProxyBuilderOptions,
      }),
      ProviderBuilder.build(RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI, {
        providerType: options?.serializer,
        defaultType: { useClass: ProducerSerializer },
      }),
      ProviderBuilder.build(RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI, {
        providerType: options?.publishOptionsBuilder,
        defaultType: { useClass: RabbitMqPublishOptionsBuilder },
      }),
      {
        provide: RABBIT_MQ_CLIENT_PROXY_DI,
        inject: [
          ELK_LOGGER_SERVICE_BUILDER_DI,
          RABBIT_MQ_CLIENT_PROXY_OPTIONS_DI,
          RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
          RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI,
        ],
        useFactory: (
          loggerBuilder: IElkLoggerServiceBuilder,
          options: Omit<IRabbitMqClientOptions, 'serializer' | 'publishOptionsBuilder'>,
          serializer: IProducerSerializer,
          publishOptionsBuilder: IRabbitMqPublishOptionsBuilder,
        ) => {
          return new RabbitMqClientProxy(
            {
              ...options,
              producer: {
                ...options.producer,
                serializer,
                publishOptionsBuilder,
              },
            },
            loggerBuilder,
          );
        },
      },
      RabbitMqClientService,
      RabbitMqClientErrorHandler,
    ];

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: RabbitMqClientModule,
      imports,
      providers,
      exports: [
        RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
        RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI,
        RABBIT_MQ_CLIENT_PROXY_DI,
        RabbitMqClientService,
        RabbitMqClientErrorHandler,
      ],
    };
  }
}

import { ConfigModule } from '@nestjs/config';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import {
  IKafkaClientModuleOptions,
  IKafkaClientServiceOptions,
  IKafkaHeadersRequestBuilder,
  IProducerSerializer,
} from './types/types';
import {
  KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI,
  KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
  KAFKA_CLIENT_PROXY_BUILDER_OPTIONS_DI,
  KAFKA_CLIENT_PROXY_DI,
} from './types/tokens';
import { KafkaHeadersRequestBuilder } from './builders/kafka.headers-request.builder';
import { ProducerSerializer } from './adapters/producer.serializer';
import { KafkaClientService } from './services/kafka-client.service';
import { KafkaClientProxy } from './services/kafka-client.proxy';

@Module({})
export class KafkaClientModule {
  public static register(options: IKafkaClientModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    let providers: Provider[] = [
      ProviderBuilder.build(KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI, {
        providerType: options?.headerBuilder,
        defaultType: { useClass: KafkaHeadersRequestBuilder },
      }),
      ProviderBuilder.build(KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI, {
        providerType: options?.serializer,
        defaultType: { useClass: ProducerSerializer },
      }),
      ProviderBuilder.build(KAFKA_CLIENT_PROXY_BUILDER_OPTIONS_DI, {
        providerType: options?.kafkaClientProxyBuilderOptions,
      }),
      {
        provide: KAFKA_CLIENT_PROXY_DI,
        inject: [
          KAFKA_CLIENT_PROXY_BUILDER_OPTIONS_DI,
          ELK_LOGGER_SERVICE_BUILDER_DI,
          KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
          KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI,
        ],
        useFactory: (
          options: IKafkaClientServiceOptions,
          loggerBuilder: IElkLoggerServiceBuilder,
          serializer: IProducerSerializer,
          headerBuilder: IKafkaHeadersRequestBuilder,
        ) => {
          return new KafkaClientProxy(options, loggerBuilder, serializer, headerBuilder);
        },
      },
      KafkaClientService,
    ];

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: KafkaClientModule,
      imports,
      providers,
      exports: [
        KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI,
        KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
        KAFKA_CLIENT_PROXY_DI,
        KafkaClientService,
      ],
    };
  }
}

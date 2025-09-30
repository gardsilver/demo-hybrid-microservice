import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { KafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';
import { KafkaServerStatusService } from './services/kafka-server.status.service';
import { IKafkaServerModuleOptions } from './types/types';
import { KAFKA_SERVER_HEADERS_ADAPTER_DI } from './types/tokens';
import { KafkaErrorFilter } from './filters/kafka.error.filter';

@Module({})
export class KafkaServerModule {
  public static forRoot(options?: IKafkaServerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];
    let providers: Provider[] = [
      ProviderBuilder.build(KAFKA_SERVER_HEADERS_ADAPTER_DI, {
        providerType: options?.headersToAsyncContextAdapter,
        defaultType: { useClass: KafkaHeadersToAsyncContextAdapter },
      }),
      KafkaServerStatusService,
      KafkaErrorFilter,
    ];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: KafkaServerModule,
      global: true,
      imports,
      providers,
      exports: [KAFKA_SERVER_HEADERS_ADAPTER_DI, KafkaServerStatusService, KafkaErrorFilter],
    };
  }
}

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportsType, ProviderBuilder } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { RabbitMqMessagePropertiesToAsyncContextAdapter } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IRabbitMqServerModuleOptions } from './types/types';
import { RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI } from './types/tokens';
import { RabbitMqServerStatusService } from './services/rabbit-mq-server.status.service';
import { RabbitMqErrorFilter } from './filters/rabbit-mq.error.filter';

@Module({})
export class RabbitMqServerModule {
  public static forRoot(options?: IRabbitMqServerModuleOptions): DynamicModule {
    let imports: ImportsType = [ConfigModule, ElkLoggerModule, PrometheusModule];
    let providers: Provider[] = [
      ProviderBuilder.build(RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI, {
        providerType: options?.messagePropertiesAdapter,
        defaultType: { useClass: RabbitMqMessagePropertiesToAsyncContextAdapter },
      }),
      RabbitMqServerStatusService,
      RabbitMqErrorFilter,
    ];

    if (options?.imports?.length) {
      imports = imports.concat(options.imports);
    }

    if (options?.providers?.length) {
      providers = providers.concat(options.providers);
    }

    return {
      module: RabbitMqServerModule,
      global: true,
      imports,
      providers,
      exports: [RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI, RabbitMqServerStatusService, RabbitMqErrorFilter],
    };
  }
}

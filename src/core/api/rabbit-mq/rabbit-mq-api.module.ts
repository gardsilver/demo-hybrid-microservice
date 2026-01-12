import { Module } from '@nestjs/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { RabbitMqClientModule } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { AppModule, AppRabbitMqConfig, RabbitMqServers } from 'src/core/app';
import { CommonApiModule } from 'src/core/api/common';
import { RabbitMqApiService } from './services/rabbit-mq-api.service';
import { RabbitMqDemoController } from './controllers/rabbit-mq-demo.controller';
import { DemoResponseSerializer } from './adapters/demo.response.serializer';

@Module({
  imports: [
    ElkLoggerModule,
    PrometheusModule,
    CommonApiModule,
    RabbitMqClientModule.register({
      imports: [AppModule],
      clientProxyBuilderOptions: {
        inject: [AppRabbitMqConfig],
        useFactory: (appRabbitMqConfig: AppRabbitMqConfig) => {
          return {
            serverName: RabbitMqServers.MAIN_RABBIT_MQ_BROKER,
            producer: {
              urls: appRabbitMqConfig.getUrls(),
              socketOptions: {
                reconnectTimeInSeconds: appRabbitMqConfig.getRetryConfig().reconnectTimeInSeconds,
                heartbeatIntervalInSeconds: appRabbitMqConfig.getRetryConfig().heartbeatIntervalInSeconds,
              },
              noAssert: true,
            },
          };
        },
      },
      serializer: {
        useClass: DemoResponseSerializer,
      },
    }),
  ],
  providers: [RabbitMqApiService],
  controllers: [RabbitMqDemoController],
})
export class RabbitMqApiModule {}

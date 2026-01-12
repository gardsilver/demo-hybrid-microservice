import { Module } from '@nestjs/common';
import { MAIN_SERVICE_NAME } from 'protos/compiled/demo/service/MainService';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { RabbitMqClientModule } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { AppModule, AppRabbitMqConfig, RabbitMqServers } from 'src/core/app';
import { DemoRequestSerializer } from './adapters/demo.request.serializer';
import { RabbitMqService } from './services/rabbit-mq.service';
import { HttpController } from './controllers/http.controller';

@Module({
  imports: [
    ElkLoggerModule,
    PrometheusModule,
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
              exchange: MAIN_SERVICE_NAME,
              exchangeType: 'direct',
            },
          };
        },
      },
      serializer: {
        useClass: DemoRequestSerializer,
      },
    }),
  ],
  providers: [RabbitMqService],
  controllers: [HttpController],
})
export class ExampleRabbitMqModule {}

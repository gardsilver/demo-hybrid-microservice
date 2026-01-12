import { Module } from '@nestjs/common';
import { AppKafkaConfig, AppModule, KafkaServers } from 'src/core/app';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { KafkaClientModule } from 'src/modules/kafka/kafka-client';
import { PrometheusModule } from 'src/modules/prometheus';
import { DemoRequestSerializer } from './adapters/demo.request.serializer';
import { KafkaService } from './services/kafka.service';
import { HttpController } from './controllers/http.controller';

@Module({
  imports: [
    ElkLoggerModule,
    PrometheusModule,
    KafkaClientModule.register({
      imports: [AppModule],
      kafkaClientProxyBuilderOptions: {
        inject: [AppKafkaConfig],
        useFactory: (config: AppKafkaConfig) => {
          return {
            serverName: KafkaServers.MAIN_KAFKA_BROKER,
            postfixId: '',
            client: {
              brokers: config.getBrokers(),
              clientId: config.getClientId(),
              useLogger: true,
              connectionTimeout: 300,
            },
            producer: {
              retry: config.getProducerRetry(),
            },
          };
        },
      },
      serializer: {
        useClass: DemoRequestSerializer,
      },
    }),
  ],
  providers: [KafkaService],
  controllers: [HttpController],
})
export class ExampleKafkaModule {}

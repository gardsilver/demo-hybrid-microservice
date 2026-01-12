import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { KafkaClientModule } from 'src/modules/kafka/kafka-client';
import { AppKafkaConfig, AppModule, KafkaServers } from 'src/core/app';
import { CommonApiModule } from 'src/core/api/common';
import { DemoResponseSerializer } from './adapters/demo.response.serializer';
import { KafkaApiService } from './services/kafka-api.service';
import { KafkaDemoController } from './controllers/kafka-demo.controller';

@Module({
  imports: [
    ConfigModule,
    ElkLoggerModule,
    PrometheusModule,
    CommonApiModule,
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
            },
            producer: {
              retry: config.getProducerRetry(),
            },
          };
        },
      },
      serializer: {
        useClass: DemoResponseSerializer,
      },
    }),
  ],
  providers: [KafkaApiService],
  controllers: [KafkaDemoController],
})
export class KafkaApiModule {}

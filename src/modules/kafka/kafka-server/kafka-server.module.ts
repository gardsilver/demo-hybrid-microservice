import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { KafkaServerStatusService } from './services/kafka-server.status.service';

@Module({})
export class KafkaServerModule {
  public static forRoot(): DynamicModule {
    return {
      module: KafkaServerModule,
      global: true,
      imports: [ConfigModule, ElkLoggerModule, PrometheusModule],
      providers: [KafkaServerStatusService],
      exports: [KafkaServerStatusService],
    };
  }
}

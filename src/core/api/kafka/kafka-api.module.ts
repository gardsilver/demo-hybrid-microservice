import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { KafkaDemoController } from './controllers/kafka-demo.controller';

@Module({
  imports: [ConfigModule, ElkLoggerModule, PrometheusModule],
  controllers: [KafkaDemoController],
})
export class KafkaApiModule {}

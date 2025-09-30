import { Module } from '@nestjs/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';
import { HttpServerModule } from 'src/modules/http/http-server';
import { KafkaServerModule } from 'src/modules/kafka/kafka-server';
import { HybridErrorResponseFilter } from './filters/hybrid.error-response.filter';

@Module({
  imports: [ElkLoggerModule, HttpServerModule, GrpcServerModule, KafkaServerModule],
  providers: [HybridErrorResponseFilter],
  exports: [HybridErrorResponseFilter],
})
export class HybridServerModule {}

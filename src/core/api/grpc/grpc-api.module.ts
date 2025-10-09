import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';
import { CommonApiModule } from 'src/core/api/common';
import { GrpcMainController } from './controllers/grpc-main.controller';

@Module({
  imports: [ConfigModule, ElkLoggerModule, PrometheusModule, GrpcServerModule, CommonApiModule],
  controllers: [GrpcMainController],
})
export class GrpcApiModule {}

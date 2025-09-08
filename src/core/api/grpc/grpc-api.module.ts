import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { RedisCacheManagerModule } from 'src/modules/redis-cache-manager';
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';
import { PostgresModule } from 'src/core/repositories/postgres';
import { GrpcApiService } from './services/grpc-api.service';
import { GrpcMainController } from './controllers/grpc-main.controller';

@Module({
  imports: [ConfigModule, ElkLoggerModule, PrometheusModule, RedisCacheManagerModule, PostgresModule, GrpcServerModule],
  controllers: [GrpcMainController],
  providers: [GrpcApiService],
})
export class GrpcApiModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgresModule } from 'src/core/repositories/postgres';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { RedisCacheManagerModule } from 'src/modules/redis-cache-manager';
import { CommonApiService } from './services/common-api.service';

@Module({
  imports: [ConfigModule, ElkLoggerModule, PrometheusModule, RedisCacheManagerModule, PostgresModule],
  providers: [CommonApiService],
  exports: [CommonApiService],
})
export class CommonApiModule {}

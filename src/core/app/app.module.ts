import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './services/app.config';
import { AppKafkaConfig } from './services/app.kafka.config';
import { ErrorFormattersService } from './services/logger/error.formatters.service';
import { DataBaseErrorFormatter, ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter } from 'src/modules/http/http-server';
import { GrpcClientErrorFormatter, GrpcServiceErrorFormatter } from 'src/modules/grpc/grpc-client';
import { RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { KafkaJsErrorObjectFormatter, KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaClientErrorObjectFormatter } from 'src/modules/kafka/kafka-client';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { ObjectFormattersService } from './services/logger/object.formatters.service';
import { IgnoreObjectsService } from './services/logger/ignore-objects.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AppConfig,
    AppKafkaConfig,
    IgnoreObjectsService,
    DataBaseErrorFormatter,
    AxiosErrorFormatter,
    HttpClientErrorFormatter,
    HttpExceptionFormatter,
    GrpcServiceErrorFormatter,
    GrpcClientErrorFormatter,
    RpcExceptionFormatter,
    RedisClientErrorFormatter,
    KafkaJsErrorObjectFormatter,
    KafkaClientErrorObjectFormatter,
    ErrorFormattersService,
    MetadataObjectFormatter,
    KafkaJsMessagesObjectFormatter,
    ValidationErrorItemObjectFormatter,
    ObjectFormattersService,
  ],
  exports: [AppConfig, AppKafkaConfig, IgnoreObjectsService, ErrorFormattersService, ObjectFormattersService],
})
export class AppModule {}

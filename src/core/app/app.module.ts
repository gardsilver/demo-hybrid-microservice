import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeneralAsyncContextFormatter } from 'src/modules/common';
import { DataBaseErrorFormatter, ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter } from 'src/modules/http/http-server';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { GrpcClientErrorFormatter, GrpcServiceErrorFormatter } from 'src/modules/grpc/grpc-client';
import { RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { KafkaJsErrorObjectFormatter, KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaClientErrorObjectFormatter } from 'src/modules/kafka/kafka-client';
import { AppConfig } from './services/app.config';
import { AppKafkaConfig } from './services/app.kafka.config';
import { ErrorFormattersFactory } from './factories/logger/error.formatters.factory';
import { ObjectFormattersFactory } from './factories/logger/object.formatters.factory';
import { IgnoreObjectsFactory } from './factories/logger/ignore-objects.factory';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
import { FormattersFactory } from './factories/logger/formatters.factory';
import { ChatController } from './controller/chat.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    AppConfig,
    AppKafkaConfig,
    IgnoreObjectsFactory,
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
    ErrorFormattersFactory,
    MetadataObjectFormatter,
    KafkaJsMessagesObjectFormatter,
    ValidationErrorItemObjectFormatter,
    ObjectFormattersFactory,
    GeneralAsyncContextFormatter,
    HttpSecurityHeadersFormatter,
    FormattersFactory,
  ],
  exports: [
    AppConfig,
    AppKafkaConfig,
    IgnoreObjectsFactory,
    ErrorFormattersFactory,
    ObjectFormattersFactory,
    FormattersFactory,
  ],
  controllers: [ChatController],
})
export class AppModule {}

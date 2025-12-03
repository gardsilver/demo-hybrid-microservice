import { DataBaseErrorFormatter } from 'src/modules/database';
import { GrpcClientErrorFormatter, GrpcServiceErrorFormatter } from 'src/modules/grpc/grpc-client';
import { RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter } from 'src/modules/http/http-server';
import { KafkaJsErrorObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaClientErrorObjectFormatter } from 'src/modules/kafka/kafka-client';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { ErrorFormattersFactory } from '../error.formatters.factory';

export abstract class ErrorFormattersFactoryBuilder {
  public static build(): ErrorFormattersFactory {
    return new ErrorFormattersFactory(
      new DataBaseErrorFormatter(),
      new AxiosErrorFormatter(),
      new HttpClientErrorFormatter(),
      new HttpExceptionFormatter(),
      new GrpcServiceErrorFormatter(),
      new GrpcClientErrorFormatter(),
      new RpcExceptionFormatter(),
      new RedisClientErrorFormatter(),
      new KafkaJsErrorObjectFormatter(),
      new KafkaClientErrorObjectFormatter(),
    );
  }
}

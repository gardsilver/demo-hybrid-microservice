import { Injectable } from '@nestjs/common';
import { ErrorFormatter } from 'src/modules/elk-logger';
import { DataBaseErrorFormatter } from 'src/modules/database';
import { GrpcClientErrorFormatter, GrpcServiceErrorFormatter } from 'src/modules/grpc/grpc-client';
import { RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter } from 'src/modules/http/http-server';
import { KafkaJsErrorObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaClientErrorObjectFormatter } from 'src/modules/kafka/kafka-client';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';

@Injectable()
export class ErrorFormattersService {
  constructor(
    protected readonly dataBaseErrorFormatter: DataBaseErrorFormatter,
    protected readonly axiosErrorFormatter: AxiosErrorFormatter,
    protected readonly httpClientErrorFormatter: HttpClientErrorFormatter,
    protected readonly httpExceptionFormatter: HttpExceptionFormatter,
    protected readonly grpcServiceErrorFormatter: GrpcServiceErrorFormatter,
    protected readonly grpcClientErrorFormatter: GrpcClientErrorFormatter,
    protected readonly rpcExceptionFormatter: RpcExceptionFormatter,
    protected readonly redisClientErrorFormatter: RedisClientErrorFormatter,
    protected readonly kafkaJsErrorObjectFormatter: KafkaJsErrorObjectFormatter,
    protected readonly kafkaClientErrorObjectFormatter: KafkaClientErrorObjectFormatter,
  ) {}

  getFormatters(): ErrorFormatter[] {
    return [
      this.dataBaseErrorFormatter,
      this.axiosErrorFormatter,
      this.httpClientErrorFormatter,
      this.httpExceptionFormatter,
      this.grpcServiceErrorFormatter,
      this.grpcClientErrorFormatter,
      this.rpcExceptionFormatter,
      this.redisClientErrorFormatter,
      this.kafkaJsErrorObjectFormatter,
      this.kafkaClientErrorObjectFormatter,
    ];
  }
}

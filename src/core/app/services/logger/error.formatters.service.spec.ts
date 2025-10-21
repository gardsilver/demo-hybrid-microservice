import { Test } from '@nestjs/testing';
import { DataBaseErrorFormatter } from 'src/modules/database';
import { GrpcServiceErrorFormatter, GrpcClientErrorFormatter } from 'src/modules/grpc/grpc-client';
import { RpcExceptionFormatter } from 'src/modules/grpc/grpc-server';
import { AxiosErrorFormatter, HttpClientErrorFormatter } from 'src/modules/http/http-client';
import { HttpExceptionFormatter } from 'src/modules/http/http-server';
import { KafkaJsErrorObjectFormatter } from 'src/modules/kafka/kafka-common';
import { KafkaClientErrorObjectFormatter } from 'src/modules/kafka/kafka-client';
import { RedisClientErrorFormatter } from 'src/modules/redis-cache-manager';
import { ErrorFormattersService } from './error.formatters.service';

describe(ErrorFormattersService.name, () => {
  let service: ErrorFormattersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
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
      ],
    }).compile();
    service = module.get(ErrorFormattersService);
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('getFormatters', async () => {
    const formatters = service.getFormatters();
    expect(formatters).toEqual([
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
    ]);
  });
});

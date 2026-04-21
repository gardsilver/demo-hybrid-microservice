import { Metadata } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { HttpErrorResponseFilter } from 'src/modules/http/http-server';
import { GrpcErrorResponseFilter } from 'src/modules/grpc/grpc-server';
import { KafkaContext, KafkaErrorFilter } from 'src/modules/kafka/kafka-server';
import { RabbitMqContext, RabbitMqErrorFilter } from 'src/modules/rabbit-mq/rabbit-mq-server';
import { HybridErrorResponseFilter } from './hybrid.error-response.filter';

describe(HybridErrorResponseFilter.name, () => {
  let httpErrorResponseFilter: HttpErrorResponseFilter;
  let grpcErrorResponseFilter: GrpcErrorResponseFilter;
  let kafkaErrorFilter: KafkaErrorFilter;
  let rabbitMqErrorFilter: RabbitMqErrorFilter;
  let filter: HybridErrorResponseFilter;

  let error: Error;
  let spyHttp: jest.SpyInstance;
  let spyGrpc: jest.SpyInstance;
  let spyKafka: jest.SpyInstance;
  let spyRabbitMq: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: HttpErrorResponseFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        {
          provide: GrpcErrorResponseFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        {
          provide: KafkaErrorFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        {
          provide: RabbitMqErrorFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        HybridErrorResponseFilter,
      ],
    }).compile();

    httpErrorResponseFilter = module.get(HttpErrorResponseFilter);
    grpcErrorResponseFilter = module.get(GrpcErrorResponseFilter);
    kafkaErrorFilter = module.get(KafkaErrorFilter);
    rabbitMqErrorFilter = module.get(RabbitMqErrorFilter);
    filter = module.get(HybridErrorResponseFilter);

    spyHttp = jest.spyOn(httpErrorResponseFilter, 'catch');
    spyGrpc = jest.spyOn(grpcErrorResponseFilter, 'catch');
    spyKafka = jest.spyOn(kafkaErrorFilter, 'catch');
    spyRabbitMq = jest.spyOn(rabbitMqErrorFilter, 'catch');

    error = new Error('Test Error');

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(httpErrorResponseFilter).toBeDefined();
    expect(grpcErrorResponseFilter).toBeDefined();
    expect(kafkaErrorFilter).toBeDefined();
    expect(rabbitMqErrorFilter).toBeDefined();
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    const host = {
      getType: () => 'tcp',
    } as unknown as ExecutionContext;

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
  });

  it('http', async () => {
    const host = {
      getType: () => 'http',
    } as unknown as ExecutionContext;

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(1);
    expect(spyHttp).toHaveBeenCalledWith(error, host);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
  });

  it('grpc', async () => {
    const host = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => new Metadata(),
      }),
    } as unknown as ExecutionContext;

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(1);
    expect(spyGrpc).toHaveBeenCalledWith(error, host);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
  });

  it('kafka', async () => {
    const kafkaContext = new KafkaContext([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ] as unknown as ConstructorParameters<typeof KafkaContext>[0]);

    const host = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => kafkaContext,
      }),
    } as unknown as ExecutionContext;

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(1);
    expect(spyKafka).toHaveBeenCalledWith(error, host);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
  });

  it('RabbitMq', async () => {
    const rabbitMqContext = new RabbitMqContext([
      undefined,
      undefined,
      undefined,
      undefined,
    ] as unknown as ConstructorParameters<typeof RabbitMqContext>[0]);

    const host = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => rabbitMqContext,
      }),
    } as unknown as ExecutionContext;

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(1);
    expect(spyRabbitMq).toHaveBeenCalledWith(error, host);
  });

  it('generic rpc falls back to BaseRpcExceptionFilter', async () => {
    const host = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const { BaseRpcExceptionFilter } = await import('@nestjs/microservices');
    const spyRpcHandle = jest
      .spyOn(BaseRpcExceptionFilter.prototype as unknown as { handleUnknownError: () => void }, 'handleUnknownError')
      .mockImplementation(() => undefined);

    filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyRpcHandle).toHaveBeenCalledTimes(1);

    spyRpcHandle.mockRestore();
  });
});

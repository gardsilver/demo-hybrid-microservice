/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-require-imports */
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { HybridErrorResponseFilter } from './hybrid.error-response.filter';

class MockHttpFilter {
  catch() {}
}
class MockGrpcFilter {
  catch() {}
}
class MockKafkaFilter {
  catch() {}
}
class MockRabbitFilter {
  catch() {}
}
class MockWsFilter {
  catch() {}
}

const mockIsGrpc = jest.fn();
const mockIsKafka = jest.fn();
const mockIsRabbitMq = jest.fn();
const mockIsWs = jest.fn();

jest.mock(
  'src/modules/grpc/grpc-server',
  () => ({
    __esModule: true,
    GrpcHelper: {
      isGrpc: (...args: any[]) => mockIsGrpc(...args),
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/modules/kafka/kafka-server',
  () => ({
    __esModule: true,
    KafkaServerHelper: {
      isKafka: (...args: any[]) => mockIsKafka(...args),
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/modules/rabbit-mq/rabbit-mq-server',
  () => ({
    __esModule: true,
    RabbitMqHelper: {
      isRabbitMq: (...args: any[]) => mockIsRabbitMq(...args),
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/modules/websocket',
  () => ({
    __esModule: true,
    WsHelper: {
      isWs: (...args: any[]) => mockIsWs(...args),
    },
  }),
  { virtual: true },
);

describe('HybridErrorResponseFilter', () => {
  let filter: HybridErrorResponseFilter;

  let spyHttp: jest.SpyInstance;
  let spyGrpc: jest.SpyInstance;
  let spyKafka: jest.SpyInstance;
  let spyRabbitMq: jest.SpyInstance;
  let spyWs: jest.SpyInstance;
  let host: jest.Mocked<ExecutionContext>;

  let error: Error;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockIsGrpc.mockReturnValue(false);
    mockIsKafka.mockReturnValue(false);
    mockIsRabbitMq.mockReturnValue(false);
    mockIsWs.mockReturnValue(false);

    const module = await Test.createTestingModule({
      providers: [
        { provide: MockHttpFilter, useValue: { catch: jest.fn() } },
        { provide: MockGrpcFilter, useValue: { catch: jest.fn() } },
        { provide: MockKafkaFilter, useValue: { catch: jest.fn() } },
        { provide: MockRabbitFilter, useValue: { catch: jest.fn() } },
        { provide: MockWsFilter, useValue: { catch: jest.fn() } },
        {
          provide: HybridErrorResponseFilter,
          useFactory: (http: any, grpc: any, kafka: any, rabbit: any, ws: any) => {
            return new HybridErrorResponseFilter(http, grpc, kafka, rabbit, ws);
          },
          inject: [MockHttpFilter, MockGrpcFilter, MockKafkaFilter, MockRabbitFilter, MockWsFilter],
        },
      ],
    }).compile();

    filter = module.get(HybridErrorResponseFilter);

    spyHttp = jest.spyOn(module.get(MockHttpFilter), 'catch');
    spyGrpc = jest.spyOn(module.get(MockGrpcFilter), 'catch');
    spyKafka = jest.spyOn(module.get(MockKafkaFilter), 'catch');
    spyRabbitMq = jest.spyOn(module.get(MockRabbitFilter), 'catch');
    spyWs = jest.spyOn(module.get(MockWsFilter), 'catch');

    host = {
      getType: jest.fn(),
      switchToRpc: jest.fn().mockImplementation(() => ({
        getContext: jest.fn(),
      })),
    } as unknown as jest.Mocked<ExecutionContext>;

    error = new Error('Test Error');
  });

  it('init', async () => {
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    host.getType.mockImplementation(() => 'tcp');

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyWs).toHaveBeenCalledTimes(0);
  });

  it('http', async () => {
    host.getType.mockImplementation(() => 'http');
    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(1);
    expect(spyHttp).toHaveBeenCalledWith(error, host);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyWs).toHaveBeenCalledTimes(0);
  });

  it('grpc', async () => {
    host.getType.mockImplementation(() => 'rpc');

    mockIsGrpc.mockReturnValueOnce(true); // Переключаем выполнение на ветку gRPC

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(1);
    expect(spyGrpc).toHaveBeenCalledWith(error, host);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyWs).toHaveBeenCalledTimes(0);
  });

  it('kafka', async () => {
    host.getType.mockImplementation(() => 'rpc');

    mockIsKafka.mockReturnValueOnce(true); // Переключаем выполнение на ветку Kafka

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(1);
    expect(spyKafka).toHaveBeenCalledWith(error, host);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyWs).toHaveBeenCalledTimes(0);
  });

  it('RabbitMq', async () => {
    host.getType.mockImplementation(() => 'rpc');
    mockIsRabbitMq.mockReturnValueOnce(true); // Переключаем выполнение на ветку RabbitMQ

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(1);
    expect(spyRabbitMq).toHaveBeenCalledWith(error, host);
    expect(spyWs).toHaveBeenCalledTimes(0);
  });

  it('websocket', async () => {
    host.getType.mockImplementation(() => 'ws');

    mockIsWs.mockReturnValueOnce(true); // Переключаем выполнение на ветку WebSockets

    await filter.catch(error, host);

    expect(spyWs).toHaveBeenCalledTimes(1);
    expect(spyWs).toHaveBeenCalledWith(error, host);
    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
  });

  it('generic rpc falls back to BaseRpcExceptionFilter', async () => {
    host.getType.mockImplementation(() => 'rpc');
    host.switchToRpc.mockImplementation(() => ({ getContext: () => ({}) }) as unknown as RpcArgumentsHost);

    const { BaseRpcExceptionFilter } = require('@nestjs/microservices');
    const spyRpcHandle = jest
      .spyOn(BaseRpcExceptionFilter.prototype as unknown as { handleUnknownError: () => void }, 'handleUnknownError')
      .mockImplementation(() => undefined);

    filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
    expect(spyKafka).toHaveBeenCalledTimes(0);
    expect(spyRabbitMq).toHaveBeenCalledTimes(0);
    expect(spyWs).toHaveBeenCalledTimes(0);
    expect(spyRpcHandle).toHaveBeenCalledTimes(1);

    spyRpcHandle.mockRestore();
  });
});

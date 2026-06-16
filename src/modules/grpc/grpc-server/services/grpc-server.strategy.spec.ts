/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { Metadata } from '@grpc/grpc-js';
import { ServerGrpc } from '@nestjs/microservices';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { GrpcServerStrategy } from './grpc-server.strategy';

const mockSpan: any = {
  spanContext: jest.fn().mockReturnValue({
    traceId: 'mocked-otel-trace-id-32-chars-long',
    spanId: 'mocked-otel-span',
  }),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
};

jest.mock('@opentelemetry/api', () => {
  const original = jest.requireActual('@opentelemetry/api');
  return {
    ...original,
    trace: {
      getTracer: jest.fn().mockReturnValue({
        startSpan: jest.fn().mockImplementation(() => mockSpan),
      }),
      getSpanContext: jest.fn(),
      setSpan: jest.fn().mockReturnValue({}),
      setSpanContext: jest.fn((ctx, spanCtx) => ({ ...ctx, __spanContext: spanCtx })),
    },
    context: {
      active: jest.fn().mockReturnValue({}),
      with: jest.fn((ctx, cb) => cb()),
    },
  };
});

jest.mock('src/modules/elk-logger', () => {
  return {
    __esModule: true,
    TraceSpanHelper: {
      generateTraceId: jest.fn().mockReturnValue('generated_trace_id_32_chars_long'),
      generateSpanId: jest.fn().mockReturnValue('generated_span_id'),
    },
  };
});

describe('GrpcServerStrategy Strategy', () => {
  let strategy: GrpcServerStrategy;
  let mockSuperAddHandler: jest.SpyInstance<void, Parameters<typeof ServerGrpc.prototype.addHandler>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan.setStatus.mockClear();
    mockSpan.recordException.mockClear();
    mockSpan.end.mockClear();

    const mockGrpcOptions = {
      url: '127.0.0.1:50051',
      package: 'demo.service',
      protoPath: 'protos/MainService.proto',
    };

    strategy = new GrpcServerStrategy(mockGrpcOptions);

    mockSuperAddHandler = jest.spyOn(ServerGrpc.prototype, 'addHandler').mockImplementation(() => {});
  });
  it('должен регистрировать хэндлер без изменений, если он уже помечен флагом телеметрии', () => {
    const mockCallback: any = () => 'result';
    mockCallback.__isWrappedWithTelemetry = true;

    strategy.addHandler('MainService/find', mockCallback, false);

    expect(mockSuperAddHandler).toHaveBeenCalledWith('MainService/find', mockCallback, false);
  });

  it('Сценарий 1: Унарный вызов с заголовками трассировки (isRemote: true)', async () => {
    const mockOriginalBusinessHandler = jest.fn().mockResolvedValue('business-response');

    strategy.addHandler('MainService/find', mockOriginalBusinessHandler, false);

    const wrappedHandler = mockSuperAddHandler.mock.calls[0][1] as (...args: any[]) => Promise<any>;
    expect((wrappedHandler as any).__isWrappedWithTelemetry).toBe(true);

    const mockMetadata = new Metadata();
    mockMetadata.set(HttpGeneralAsyncContextHeaderNames.TRACE_ID, 'e0d75fe06590761bde9ca278e254c171');
    mockMetadata.set(HttpGeneralAsyncContextHeaderNames.SPAN_ID, '4a6f55e49ff028be');

    const mockCall = { query: 'Петр' };
    const mockRpcCallback = jest.fn();

    const result = await wrappedHandler(mockCall, mockMetadata, mockRpcCallback);

    expect(result).toBe('business-response');
    expect(mockOriginalBusinessHandler).toHaveBeenCalledWith(mockCall, mockMetadata, mockRpcCallback);

    expect(trace.getTracer('grpc-server-transport').startSpan).toHaveBeenCalledWith(
      'gRPC SERVER: MainService/find',
      {
        attributes: {
          'rpc.system': 'grpc',
          'rpc.method': 'MainService/find',
        },
      },
      expect.any(Object),
    );

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: 'e0d75fe06590761bde9ca278e254c171',
        spanId: '4a6f55e49ff028be',
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      }),
    );

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 2: Стриминговый вызов без заголовков трассировки — генерация уникального контекста (isRemote: false)', async () => {
    const mockPattern = 'MainService/streamData';
    const mockOriginalBusinessHandler = jest.fn().mockResolvedValue('stream-success');

    strategy.addHandler(mockPattern, mockOriginalBusinessHandler, true);

    const wrappedHandler = mockSuperAddHandler.mock.calls[0][1] as (...args: any[]) => Promise<any>;

    const mockMetadata = new Metadata();
    const mockCall = {
      metadata: mockMetadata,
      request: { id: 123 },
    };

    await wrappedHandler(mockCall, undefined);

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: 'generated_trace_id_32_chars_long',
        spanId: 'generated_span_id',
        isRemote: false,
      }),
    );

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 3: Падение бизнес-логики / Guards — запись recordException и статуса ERROR', async () => {
    const mockOriginalBusinessHandler = jest.fn().mockImplementation(() => {
      throw new Error('RPC Authorization Token Expired');
    });

    strategy.addHandler('MainService/secureFind', mockOriginalBusinessHandler, false);

    const wrappedHandler = mockSuperAddHandler.mock.calls[0][1] as (...args: any[]) => Promise<any>;

    await expect(wrappedHandler({}, new Metadata(), jest.fn())).rejects.toThrow('RPC Authorization Token Expired');

    expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'RPC Authorization Token Expired',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 4: Вызов при пустых аргументах (безопасный фолбек пустых метаданных)', async () => {
    const mockOriginalBusinessHandler = jest.fn().mockResolvedValue('empty-fallback-success');

    strategy.addHandler('MainService/emptyCall', mockOriginalBusinessHandler, false);

    const wrappedHandler = mockSuperAddHandler.mock.calls[0][1] as (...args: any[]) => Promise<any>;

    const result = await wrappedHandler();

    expect(result).toBe('empty-fallback-success');

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: 'generated_trace_id_32_chars_long',
        isRemote: false,
      }),
    );
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, TraceFlags, SpanStatusCode } from '@opentelemetry/api';

const mockSpan: any = {
  spanContext: jest.fn().mockReturnValue({
    traceId: 'mocked-otel-trace-id-32-chars-long',
    spanId: 'mocked-otel-span',
  }),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
};

jest.mock('src/modules/elk-logger', () => {
  return {
    __esModule: true,
    TraceSpanHelper: {
      generateTraceId: jest.fn().mockReturnValue('generated_trace_id_32_chars_long'),
      generateSpanId: jest.fn().mockReturnValue('generated_span_id'),
    },
  };
});

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

jest.mock('src/modules/rabbit-mq/rabbit-mq-common', () => {
  return {
    __esModule: true,
    RabbitMqMessageHelper: {
      normalize: jest.fn((headers) => headers),
      searchHeaderAsString: jest.fn(),
    },
  };
});

import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { RabbitMqTelemetry } from './rabbit-mq-telemetry.decorator'; // Скорректируйте путь до файла декоратора

describe('RabbitMqTelemetry Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan.setStatus.mockClear();
    mockSpan.recordException.mockClear();
    mockSpan.end.mockClear();

    (RabbitMqMessageHelper.searchHeaderAsString as jest.Mock).mockReturnValue(undefined);
  });

  it('должен прозрачно пропустить выполнение, если аргументы или свойства сообщения отсутствуют', () => {
    const mockOriginalMethod = jest.fn().mockReturnValue('sync-success');

    class TestServer {
      @RabbitMqTelemetry()
      public handleMessage(...args: any[]) {
        return mockOriginalMethod(...args);
      }
    }

    const server = new TestServer();
    const result = server.handleMessage(undefined, {}); // свойства отсутствуют

    expect(result).toBe('sync-success');
    expect(trace.getTracer).not.toHaveBeenCalled();
    expect(mockOriginalMethod).toHaveBeenCalledWith(undefined, {});
  });

  it('Сценарий 1: Успешный асинхронный вызов с заголовками трассировки продюсера (isRemote: true)', async () => {
    const valid32CharTraceId = 'producer_trace_id_32_chars_long_'; // ровно 32 символа
    const valid16CharSpanId = 'producer_span_id'; // ровно 16 символов

    (RabbitMqMessageHelper.searchHeaderAsString as jest.Mock)
      .mockReturnValueOnce(valid32CharTraceId)
      .mockReturnValueOnce(valid16CharSpanId);

    const mockPayload: any = {
      properties: {
        headers: {
          'x-trace-id': valid32CharTraceId,
          'x-span-id': valid16CharSpanId,
        },
      },
    };

    const mockOriginalMethod = jest.fn().mockResolvedValue('async-processed');

    class TestServer {
      @RabbitMqTelemetry()
      public async handleMessage(pattern: string, message: any) {
        return mockOriginalMethod(pattern, message);
      }
    }

    const server = new TestServer();
    const result = await server.handleMessage('user.signup.v1', mockPayload);

    expect(result).toBe('async-processed');

    expect(trace.getTracer('rabbitmq-server-transport').startSpan).toHaveBeenCalledWith(
      'RabbitMQ CONSUMER: handleMessage [user.signup.v1]',
      {
        attributes: {
          'messaging.system': 'rabbitmq',
          'messaging.operation': 'process',
          'messaging.destination': 'user.signup.v1',
          'code.function': 'handleMessage',
          'code.namespace': 'TestServer',
        },
      },
      expect.any(Object),
    );

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: valid32CharTraceId,
        spanId: valid16CharSpanId,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      }),
    );

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 2: Вызов без заголовков трассировки продюсера — принудительный разрыв связи и генерация ID (isRemote: false)', () => {
    const mockPayload: any = {
      properties: { headers: {} },
    };

    const mockOriginalMethod = jest.fn().mockReturnValue('sync-processed');

    class TestServer {
      @RabbitMqTelemetry()
      public handleMessage(pattern: string, message: any) {
        return mockOriginalMethod(pattern, message);
      }
    }

    const server = new TestServer();
    const result = server.handleMessage('order.create.v1', mockPayload);

    expect(result).toBe('sync-processed');

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: 'generated_trace_id_32_chars_long',
        spanId: 'generated_span_id',
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      }),
    );
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 3: Асинхронное падение обработчика — запись recordException и выставление статуса ERROR', async () => {
    const mockPayload: any = {
      properties: { headers: {} },
    };
    const mockRuntimeError = new Error('AMQP Channel Closed Due to Timeout');
    const mockOriginalMethod = jest.fn().mockRejectedValue(mockRuntimeError);

    class TestServer {
      @RabbitMqTelemetry()
      public async handleMessage(pattern: string, message: any) {
        return mockOriginalMethod(pattern, message);
      }
    }

    const server = new TestServer();

    await expect(server.handleMessage('payment.verify.v1', mockPayload)).rejects.toThrow(
      'AMQP Channel Closed Due to Timeout',
    );

    expect(mockSpan.recordException).toHaveBeenCalledWith(mockRuntimeError);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'AMQP Channel Closed Due to Timeout',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 4: Синхронное падение обработчика (throw Error) — 100% покрытие блока catch синхронной ветки', () => {
    const mockPayload: any = {
      properties: { headers: {} },
    };
    const mockSyncError = new Error('Synchronous Pipeline Crash');
    const mockOriginalMethod = jest.fn().mockImplementation(() => {
      throw mockSyncError;
    });

    class TestServer {
      @RabbitMqTelemetry()
      public handleMessage(pattern: string, message: any) {
        return mockOriginalMethod(pattern, message);
      }
    }

    const server = new TestServer();

    expect(() => server.handleMessage('inventory.rollback.v1', mockPayload)).toThrow('Synchronous Pipeline Crash');

    expect(mockSpan.recordException).toHaveBeenCalledWith(mockSyncError);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Synchronous Pipeline Crash',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });
});

/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/unbound-method */
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

import { BaseHeadersHelper } from 'src/modules/common';
import { KafkaTelemetry } from './kafka-telemetry.decorator';

describe('KafkaTelemetry Decorator', () => {
  let spySearchHeaderAsString: jest.SpiedFunction<typeof BaseHeadersHelper.searchHeaderAsString>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan.setStatus.mockClear();
    mockSpan.recordException.mockClear();
    mockSpan.end.mockClear();

    spySearchHeaderAsString = jest.spyOn(BaseHeadersHelper, 'searchHeaderAsString').mockReturnValue(undefined);
  });

  it('должен прозрачно пропустить выполнение, если payload (первый аргумент) отсутствует', () => {
    const mockOriginalMethod = jest.fn().mockReturnValue('sync-success');

    class TestClass {
      @KafkaTelemetry()
      public handleCall(...args: any[]) {
        return mockOriginalMethod(...args);
      }
    }

    const instance = new TestClass();
    const result = instance.handleCall(undefined);

    expect(result).toBe('sync-success');
    expect(trace.getTracer).not.toHaveBeenCalled();
    expect(mockOriginalMethod).toHaveBeenCalledWith(undefined);
  });

  it('Сценарий 1: Одиночное сообщение (eachMessage) с переданными заголовками трассировки', async () => {
    const valid32CharTraceId = 'producer_trace_id_32_chars_long_';
    const valid16CharSpanId = 'producer_span_id';

    spySearchHeaderAsString.mockReturnValueOnce(valid32CharTraceId).mockReturnValueOnce(valid16CharSpanId);

    const mockPayload = {
      topic: 'DemoResponse',
      message: {
        headers: {
          'x-trace-id': valid32CharTraceId,
          'x-span-id': valid16CharSpanId,
        },
      },
    };

    const mockOriginalMethod = jest.fn().mockResolvedValue('async-success');

    class TestClass {
      @KafkaTelemetry()
      public async handleEachMessage(payload: any) {
        return mockOriginalMethod(payload);
      }
    }

    const instance = new TestClass();
    const result = await instance.handleEachMessage(mockPayload);

    expect(result).toBe('async-success');

    expect(trace.getTracer('kafka-server-transport').startSpan).toHaveBeenCalledWith(
      'Kafka CONSUMER: handleEachMessage [DemoResponse]',
      {
        attributes: {
          'code.function': 'handleEachMessage',
          'code.namespace': 'TestClass',
          'messaging.destination': 'DemoResponse',
          'messaging.operation': 'process',
          'messaging.system': 'kafka',
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

  it('Сценарий 2: Батч сообщений (eachBatch) БЕЗ заголовков трассировки — генерация уникального контекста', async () => {
    const mockPayload = {
      batch: {
        topic: 'DemoBatchTopic',
        messages: [{ headers: {} }],
      },
    };

    const mockOriginalMethod = jest.fn().mockResolvedValue('batch-success');

    class TestClass {
      @KafkaTelemetry()
      public async handleBatchMessages(payload: any) {
        return mockOriginalMethod(payload);
      }
    }

    const instance = new TestClass();
    await instance.handleBatchMessages(mockPayload);

    expect(trace.getTracer('kafka-server-transport').startSpan).toHaveBeenCalledWith(
      'Kafka CONSUMER: handleBatchMessages [DemoBatchTopic]',
      {
        attributes: {
          'code.function': 'handleBatchMessages',
          'code.namespace': 'TestClass',
          'messaging.destination': 'DemoBatchTopic',
          'messaging.operation': 'process',
          'messaging.system': 'kafka',
        },
      },
      expect.any(Object),
    );

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: 'generated_trace_id_32_chars_long',
        spanId: 'generated_span_id',
        isRemote: false,
      }),
    );
  });

  it('Сценарий 3: Асинхронное падение — обработка ошибок (Promise.reject)', async () => {
    const mockPayload = { message: { headers: {} } };
    const mockError = new Error('Kafka Broker Disconnected');
    const mockOriginalMethod = jest.fn().mockRejectedValue(mockError);

    class TestClass {
      @KafkaTelemetry()
      public async handleFailedCall(payload: any) {
        return mockOriginalMethod(payload);
      }
    }

    const instance = new TestClass();

    await expect(instance.handleFailedCall(mockPayload)).rejects.toThrow('Kafka Broker Disconnected');

    expect(mockSpan.recordException).toHaveBeenCalledWith(mockError);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Kafka Broker Disconnected',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 4: Синхронный успешный вызов — должен проставить статус OK и закрыть спан', () => {
    const mockPayload = { message: { headers: {} } };
    const mockOriginalMethod = jest.fn().mockReturnValue('sync-flat-data');

    class TestClass {
      @KafkaTelemetry()
      public handleSyncCall(payload: any) {
        return mockOriginalMethod(payload);
      }
    }

    const instance = new TestClass();
    const result = instance.handleSyncCall(mockPayload);

    expect(result).toBe('sync-flat-data');
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('Сценарий 5: Синхронное падение (throw Error) — должен поймать ошибку в блоке catch, логировать и закрыть спан', () => {
    const mockPayload = { message: { headers: {} } };
    const mockSyncError = new Error('Sync Execution Panic');

    const mockOriginalMethod = jest.fn().mockImplementation(() => {
      throw mockSyncError;
    });

    class TestClass {
      @KafkaTelemetry()
      public handleSyncPanic(payload: any) {
        return mockOriginalMethod(payload);
      }
    }

    const instance = new TestClass();

    // Проверяем, что синхронное исключение пробрасывается наружу
    expect(() => instance.handleSyncPanic(mockPayload)).toThrow('Sync Execution Panic');

    // Проверяем прохождение ветки "catch (error: any)" внутри декоратора
    expect(mockSpan.recordException).toHaveBeenCalledWith(mockSyncError);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Sync Execution Panic',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });
});

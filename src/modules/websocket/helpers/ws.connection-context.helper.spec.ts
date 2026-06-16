/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { WsConnectionContextHelper } from './ws.connection-context.helper';

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

describe('WsConnectionContextHelper', () => {
  let mockHeadersAdapter: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan.setStatus.mockClear();
    mockSpan.recordException.mockClear();
    mockSpan.end.mockClear();

    mockHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({
        requestId: 'custom-req-id',
        correlationId: 'custom-corr-id',
      }),
    };

    mockClient = {
      id: 'ws-test-socket-id-123',
      handshake: {
        headers: {},
      },
    };
  });

  it('Сценарий 1: Установка соединения с переданными заголовками трассировки (isRemote: true)', () => {
    const valid32CharTraceId = 'producer_trace_id_32_chars_long_';
    const valid16CharSpanId = 'producer_span_id';

    mockClient.handshake.headers = {
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID.toLowerCase()]: valid32CharTraceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID.toLowerCase()]: valid16CharSpanId,
    };

    const mockBusinessBlock = jest.fn().mockImplementation(() => {
      expect(GeneralAsyncContext.instance.get('traceId')).toBe('mocked-otel-trace-id-32-chars-long');
      expect(GeneralAsyncContext.instance.get('requestId')).toBe('custom-req-id');
      return 'handshake-success';
    });

    const result = WsConnectionContextHelper.run(mockClient, mockHeadersAdapter, mockBusinessBlock);

    expect(result).toBe('handshake-success');
    expect(mockBusinessBlock).toHaveBeenCalledTimes(1);

    expect(trace.getTracer('websocket-platform-transport').startSpan).toHaveBeenCalledWith(
      'WS CONNECT: Handshake [ws-test-socket-id-123]',
      {},
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

  it('Сценарий 2: Коннект БЕЗ заголовков трассировки — разрыв связи и генерация уникального контекста (isRemote: false)', () => {
    mockClient.handshake.headers = {};

    const mockBusinessBlock = jest.fn().mockReturnValue('flat-success');

    const result = WsConnectionContextHelper.run(mockClient, mockHeadersAdapter, mockBusinessBlock);

    expect(result).toBe('flat-success');

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

  it('Сценарий 3: Перехват исключений — должен логировать ошибку в спан и пробрасывать её наверх', () => {
    const mockRuntimeError = new Error('Handshake Rejected: Token Blacklisted');

    const mockBusinessBlock = jest.fn().mockImplementation(() => {
      throw mockRuntimeError;
    });

    expect(() => {
      WsConnectionContextHelper.run(mockClient, mockHeadersAdapter, mockBusinessBlock);
    }).toThrow('Handshake Rejected: Token Blacklisted');

    expect(mockSpan.recordException).toHaveBeenCalledWith(mockRuntimeError);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Handshake Rejected: Token Blacklisted',
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });
});

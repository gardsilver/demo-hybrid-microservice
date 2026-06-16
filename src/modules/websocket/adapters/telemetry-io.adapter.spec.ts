/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsPacketHelper } from '../helpers/ws-packet.helper';
import { TelemetryIoAdapter } from './telemetry-io.adapter';

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('generated_trace_id_32_chars_long'),
    generateSpanId: jest.fn().mockReturnValue('generated_span_id'),
  },
}));

jest.mock(
  'src/modules/http/http-server',
  () => ({
    __esModule: true,
    HTTP_SERVER_HEADERS_ADAPTER_DI: Symbol('HTTP_SERVER_HEADERS_ADAPTER_DI'),
  }),
  { virtual: true },
);

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

describe('TelemetryIoAdapter', () => {
  let adapter: TelemetryIoAdapter;
  let mockAppContext: jest.Mocked<INestApplicationContext>;
  let mockHeadersAdapter: any;
  let mockSocketServer: jest.Mocked<Server>;
  let spySuperCreateIOServer: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpan.setStatus.mockClear();
    mockSpan.recordException.mockClear();
    mockSpan.end.mockClear();

    mockAppContext = {} as any;
    mockHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({ requestId: 'custom-id' }),
    };

    mockSocketServer = {
      use: jest.fn(),
    } as any;

    spySuperCreateIOServer = jest.spyOn(IoAdapter.prototype, 'createIOServer').mockReturnValue(mockSocketServer as any);

    adapter = new TelemetryIoAdapter(
      mockAppContext,
      { cors: { origin: '*' }, transports: ['polling', 'websocket'] },
      mockHeadersAdapter,
    );
  });

  it('должен корректно инициализировать сервер с переданными CORS-опциями', () => {
    const result = adapter.createIOServer(3000, { existing: 'option' });

    expect(spySuperCreateIOServer).toHaveBeenCalledWith(3000, {
      existing: 'option',
      cors: { origin: '*' },
      transports: ['polling', 'websocket'],
    });
    expect(result).toBe(mockSocketServer as any);
    expect(mockSocketServer.use).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('Сквозной жизненный цикл WebSocket-трафика', () => {
    let serverMiddlewareCallback: (socket: any, next: any) => void;
    let mockClientSocket: any;

    beforeEach(() => {
      adapter.createIOServer(3000);

      serverMiddlewareCallback = (mockSocketServer.use as jest.Mock).mock.calls[0][0];

      mockClientSocket = {
        id: 'session-id-123',
        handshake: { headers: {} },
        use: jest.fn().mockImplementation((fn) => {
          mockClientSocket.__registeredClientMiddleware = fn;
        }),
      };
    });

    it('Сценарий 1: Успешная обработка события с переданными заголовками трассировки продюсера (isRemote: true)', async () => {
      const valid32CharTraceId = 'producer_trace_id_32_chars_long_';
      const valid16CharSpanId = 'producer_span_id';

      mockClientSocket.handshake.headers = {
        'x-trace-id': valid32CharTraceId,
        'x-span-id': valid16CharSpanId,
      };

      const mockServerNext = jest.fn();

      serverMiddlewareCallback(mockClientSocket, mockServerNext);

      expect(mockServerNext).toHaveBeenCalledTimes(1);
      expect(mockClientSocket.use).toHaveBeenCalledWith(expect.any(Function));

      const clientEventMiddleware = mockClientSocket.__registeredClientMiddleware;
      const mockEventNext = jest.fn();

      jest.spyOn(WsPacketHelper, 'getEventName').mockReturnValue('askMessage');

      if (clientEventMiddleware) {
        await clientEventMiddleware(['askMessage'], mockEventNext);
      }

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ traceId: valid32CharTraceId, isRemote: true }),
      );
      expect(mockEventNext).toHaveBeenCalledTimes(1);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });

      expect(mockSpan.end).toHaveBeenCalledTimes(2);
    });

    it('Сценарий 2: Вызов без заголовков трассировки — генерация нового уникального traceId (isRemote: false)', async () => {
      mockClientSocket.handshake.headers = {};

      serverMiddlewareCallback(mockClientSocket, jest.fn());

      const clientEventMiddleware = mockClientSocket.__registeredClientMiddleware;
      const mockEventNext = jest.fn();
      jest.spyOn(WsPacketHelper, 'getEventName').mockReturnValue('ping');

      if (clientEventMiddleware) {
        await clientEventMiddleware(['ping'], mockEventNext);
      }

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ traceId: 'generated_trace_id_32_chars_long', isRemote: false }),
      );
      expect(mockEventNext).toHaveBeenCalledTimes(1);
    });

    it('Сценарий 3: Пропуск пустых или невалидных пакетов (eventName === undefined)', async () => {
      serverMiddlewareCallback(mockClientSocket, jest.fn());

      const clientEventMiddleware = mockClientSocket.__registeredClientMiddleware;
      const mockEventNext = jest.fn();
      jest.spyOn(WsPacketHelper, 'getEventName').mockReturnValue(undefined);

      if (clientEventMiddleware) {
        await clientEventMiddleware([], mockEventNext);
      }

      expect(mockEventNext).toHaveBeenCalledTimes(1);
      expect(trace.getTracer('websocket-platform-transport').startSpan).not.toHaveBeenCalled();
    });

    it('Сценарий 4: Падение пайплайна — запись recordException и статуса ERROR', () => {
      serverMiddlewareCallback(mockClientSocket, jest.fn());

      const clientEventMiddleware = mockClientSocket.__registeredClientMiddleware;
      jest.spyOn(WsPacketHelper, 'getEventName').mockReturnValue('secureEvent');

      const mockRuntimeError = new Error('WS Guard Reject: Unauthorized Session');

      const mockEventNext = jest.fn().mockImplementation(() => {
        throw mockRuntimeError;
      });

      if (clientEventMiddleware) {
        expect(() => {
          clientEventMiddleware(['secureEvent'], mockEventNext);
        }).toThrow('WS Guard Reject: Unauthorized Session');
      }

      expect(mockSpan.recordException).toHaveBeenCalledWith(mockRuntimeError);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'WS Guard Reject: Unauthorized Session',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });
});

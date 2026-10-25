/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server } from 'socket.io';

import { AuthStatus, IAuthService } from 'src/modules/auth';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { WsPacketHelper } from '../helpers/ws.packet.helper';
import { WsConnectionContextHelper } from '../helpers/ws.connection-context.helper';
import { TelemetryIoAdapter } from './telemetry-io.adapter';

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('a'.repeat(32)),
    generateSpanId: jest.fn().mockReturnValue('b'.repeat(16)),
  },
}));

jest.mock('@opentelemetry/api', () => {
  const original = jest.requireActual('@opentelemetry/api');

  return {
    ...original,
    trace: {
      ...original.trace,
      getTracer: jest.fn(),
      getSpanContext: jest.fn(),
      setSpan: jest.fn().mockReturnValue({}),
      setSpanContext: jest.fn((ctx: any, spanCtx: any) => ({
        ...ctx,
        __spanContext: spanCtx,
      })),
    },
    context: {
      ...original.context,
      active: jest.fn().mockReturnValue({}),
      with: jest.fn((_ctx: any, callback: () => any) => callback()),
    },
  };
});

jest.mock('src/modules/common/context', () => ({
  GeneralAsyncContext: {
    define: jest.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor),
    instance: {
      runWithContext: jest.fn((callback: () => any) => callback()),
    },
  },
}));

jest.mock('../helpers/ws.connection-context.helper', () => ({
  WsConnectionContextHelper: {
    setContextTelemetry: jest.fn(),
    setAuthInfo: jest.fn(),
    getRequiredContext: jest.fn(),
  },
}));

const mockSpan: any = {
  spanContext: jest.fn().mockReturnValue({
    traceId: 'c'.repeat(32),
    spanId: 'd'.repeat(16),
    traceFlags: 1,
  }),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
};

const mockStartSpan = jest.fn().mockReturnValue(mockSpan);

jest.mock('../helpers/ws.packet.helper', () => ({
  WsPacketHelper: {
    getEventName: jest.fn(),
  },
}));

describe('TelemetryIoAdapter', () => {
  let adapter: TelemetryIoAdapter;
  let mockAppContext: jest.Mocked<INestApplicationContext>;
  let mockHeadersAdapter: any;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockSocketServer: jest.Mocked<Server>;
  let spySuperCreateIOServer: jest.SpyInstance;

  let serverMiddlewareCallback: any;
  let packetMiddleware: any;
  let mockClientSocket: any;

  const mockConnectionContext = {};
  const mockEventContext = {};

  const mockAsyncContext = {
    traceId: 'c'.repeat(32),
    spanId: 'd'.repeat(16),
    parentSpanId: 'b'.repeat(16),
    initialSpanId: 'b'.repeat(16),
  };

  const authSuccess = {
    status: AuthStatus.SUCCESS,
  } as Awaited<ReturnType<IAuthService['authenticate']>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan.spanContext.mockReturnValue({
      traceId: 'c'.repeat(32),
      spanId: 'd'.repeat(16),
      traceFlags: 1,
    });

    jest.mocked(trace.getTracer).mockReturnValue({
      startSpan: mockStartSpan,
    } as any);

    jest
      .mocked(trace.setSpan)
      .mockReturnValueOnce(mockConnectionContext as any)
      .mockReturnValue(mockEventContext as any);

    jest
      .mocked(trace.setSpanContext)
      .mockImplementation((ctx: any, spanCtx: any) => ({ ...ctx, __spanContext: spanCtx }));

    jest.mocked(GeneralAsyncContext.instance.runWithContext).mockImplementation((callback: any) => callback());

    mockAppContext = {} as any;

    mockHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({ requestId: 'custom-id' }),
    };

    mockAuthService = {
      authenticate: jest.fn().mockResolvedValue(authSuccess),
    } as any;

    mockSocketServer = {
      use: jest.fn(),
    } as any;

    spySuperCreateIOServer = jest.spyOn(IoAdapter.prototype, 'createIOServer').mockReturnValue(mockSocketServer as any);

    adapter = new TelemetryIoAdapter(
      mockAppContext,
      {
        cors: { origin: '*' },
        transports: ['polling', 'websocket'],
      },
      mockHeadersAdapter,
      mockAuthService,
    );

    mockClientSocket = {
      id: 'session-id-123',
      handshake: { headers: {} },
      use: jest.fn().mockImplementation((fn: any) => {
        packetMiddleware = fn;
      }),
    };
  });

  afterEach(() => {
    spySuperCreateIOServer.mockRestore();
    jest.restoreAllMocks();
  });

  async function flushPromises(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  async function initializeConnection(): Promise<void> {
    adapter.createIOServer(3000);

    serverMiddlewareCallback = mockSocketServer.use.mock.calls[0][0];

    const next = jest.fn();

    serverMiddlewareCallback(mockClientSocket, next);

    await flushPromises();

    expect(next).toHaveBeenCalledWith();

    // Middleware 2 registers the packet middleware on the client.
    const packetRegistrationMiddleware = mockSocketServer.use.mock.calls[1][0];

    packetRegistrationMiddleware(mockClientSocket, jest.fn());

    expect(mockClientSocket.use).toHaveBeenCalledWith(expect.any(Function));

    jest.mocked(WsConnectionContextHelper.getRequiredContext).mockReturnValue({
      context: mockConnectionContext as any,
      span: mockSpan,
      asyncContext: mockAsyncContext,
    } as any);

    // Ignore spans created during the handshake when testing events.
    mockStartSpan.mockClear();
    //mockSpan.setStatus.mockClear();
    //mockSpan.recordException.mockClear();
    //mockSpan.end.mockClear();
  }

  it('должен корректно инициализировать сервер с переданными CORS-опциями', () => {
    const result = adapter.createIOServer(3000, {
      existing: 'option',
    } as any);

    expect(spySuperCreateIOServer).toHaveBeenCalledWith(3000, {
      existing: 'option',
      cors: { origin: '*' },
      transports: ['polling', 'websocket'],
    });

    expect(result).toBe(mockSocketServer as any);
    expect(mockSocketServer.use).toHaveBeenCalledTimes(2);
    expect(mockSocketServer.use).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(mockSocketServer.use).toHaveBeenNthCalledWith(2, expect.any(Function));
  });

  describe('Сквозной жизненный цикл WebSocket-трафика', () => {
    it('Сценарий 1: успешное подключение с заголовками трассировки и обработка события', async () => {
      const valid32CharTraceId = '1'.repeat(32);
      const valid16CharSpanId = '2'.repeat(16);

      mockClientSocket.handshake.headers = {
        'x-trace-id': valid32CharTraceId,
        'x-span-id': valid16CharSpanId,
      };

      await initializeConnection();

      expect(mockAuthService.authenticate).toHaveBeenCalled();
      expect(WsConnectionContextHelper.setContextTelemetry).toHaveBeenCalled();
      expect(WsConnectionContextHelper.setAuthInfo).toHaveBeenCalledWith(mockClientSocket, authSuccess);

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: valid32CharTraceId,
          spanId: valid16CharSpanId,
          isRemote: true,
        }),
      );

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.OK,
      });

      jest.mocked(WsPacketHelper.getEventName).mockReturnValue('askMessage');

      const mockEventNext = jest.fn();

      packetMiddleware(['askMessage'], mockEventNext);

      expect(mockStartSpan).toHaveBeenCalledWith(
        'WS EVENT: [askMessage]',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'messaging.system': 'websocket',
            'messaging.operation': 'process',
            'messaging.destination': 'askMessage',
            'websocket.socketId': 'session-id-123',
          }),
        }),
        mockConnectionContext,
      );

      expect(mockEventNext).toHaveBeenCalledTimes(1);
      expect(mockEventNext).toHaveBeenCalledWith();
    });

    it('Сценарий 2: без заголовков трассировки используется сгенерированный traceId', async () => {
      mockClientSocket.handshake.headers = {};

      await initializeConnection();

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: 'a'.repeat(32),
          spanId: 'b'.repeat(16),
          isRemote: false,
        }),
      );

      jest.mocked(WsPacketHelper.getEventName).mockReturnValue('ping');

      const mockEventNext = jest.fn();

      packetMiddleware(['ping'], mockEventNext);

      expect(mockStartSpan).toHaveBeenCalledWith('WS EVENT: [ping]', expect.any(Object), mockConnectionContext);

      expect(mockEventNext).toHaveBeenCalledTimes(1);
    });

    it('Сценарий 3: пустые или невалидные пакеты пропускаются без создания event span', async () => {
      await initializeConnection();

      jest.mocked(WsPacketHelper.getEventName).mockReturnValue(undefined);

      const mockEventNext = jest.fn();

      packetMiddleware([], mockEventNext);

      expect(mockEventNext).toHaveBeenCalledTimes(1);
      expect(mockEventNext).toHaveBeenCalledWith();
      expect(mockStartSpan).not.toHaveBeenCalled();
    });

    it('Сценарий 4: ошибка в eventNext пробрасывается вызывающему коду', async () => {
      await initializeConnection();

      mockSpan.setStatus.mockClear();
      mockSpan.recordException.mockClear();
      mockSpan.end.mockClear();

      jest.mocked(WsPacketHelper.getEventName).mockReturnValue('secureEvent');

      const mockRuntimeError = new Error('WS Guard Reject: Unauthorized Session');

      const mockEventNext = jest.fn(() => {
        throw mockRuntimeError;
      });

      expect(() => {
        packetMiddleware(['secureEvent'], mockEventNext);
      }).toThrow('WS Guard Reject: Unauthorized Session');

      expect(mockStartSpan).toHaveBeenCalledTimes(1);
      expect(mockSpan.recordException).not.toHaveBeenCalled();
      expect(mockSpan.setStatus).not.toHaveBeenCalled();
      expect(mockSpan.end).not.toHaveBeenCalled();
    });

    it('Сценарий 5: отклоняет подключение при неуспешной аутентификации', async () => {
      mockAuthService.authenticate.mockResolvedValue({
        status: 'INVALID_TOKEN',
      } as any);

      adapter.createIOServer(3000);

      const handshakeMiddleware = mockSocketServer.use.mock.calls[0][0];
      const next = jest.fn();

      handshakeMiddleware(mockClientSocket, next);

      await flushPromises();

      expect(next).toHaveBeenCalledTimes(1);

      const error = next.mock.calls[0][0];

      expect(error).toMatchObject({
        message: 'WebSocket connection rejected',
        data: {
          code: 'UNAUTHORIZED',
          message: 'WebSocket authentication failed: INVALID_TOKEN',
        },
      });

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'WebSocket authentication failed: INVALID_TOKEN',
      });

      expect(mockSpan.end).toHaveBeenCalledTimes(1);
      expect(WsConnectionContextHelper.setAuthInfo).not.toHaveBeenCalled();
    });

    it('Сценарий 6: записывает исключение при ошибке аутентификации', async () => {
      mockAuthService.authenticate.mockRejectedValue(new Error('Authentication error'));

      adapter.createIOServer(3000);

      const handshakeMiddleware = mockSocketServer.use.mock.calls[0][0];
      const next = jest.fn();

      handshakeMiddleware(mockClientSocket, next);

      await flushPromises();

      expect(mockSpan.recordException).toHaveBeenCalledWith(new Error('Authentication error'));

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'WebSocket connection rejected',
          data: {
            code: 'UNAUTHORIZED',
            message: 'WebSocket authentication failed',
          },
        }),
      );

      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it('Сценарий 7: прекращает обработку пакета при отсутствии telemetry context', async () => {
      await initializeConnection();

      jest.mocked(WsConnectionContextHelper.getRequiredContext).mockReturnValue(undefined as any);

      jest.mocked(WsPacketHelper.getEventName).mockReturnValue('message');

      const mockEventNext = jest.fn();

      packetMiddleware(['message'], mockEventNext);

      expect(mockEventNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'WebSocket telemetry context is missing',
        }),
      );

      expect(mockStartSpan).not.toHaveBeenCalled();
    });
  });
});

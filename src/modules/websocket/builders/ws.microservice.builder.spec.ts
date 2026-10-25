/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

const MOCK_HEADERS_ADAPTER_TOKEN = Symbol('HTTP_SERVER_HEADERS_ADAPTER_DI');
const MOCK_AUTH_SERVICE_TOKEN = Symbol('AUTH_SERVICE_DI');

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  ...jest.requireActual('src/modules/elk-logger'),
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('a'.repeat(32)),
    generateSpanId: jest.fn().mockReturnValue('b'.repeat(16)),
  },
}));

jest.mock(
  'src/modules/http/http-server',
  () => ({
    __esModule: true,
    HTTP_SERVER_HEADERS_ADAPTER_DI: MOCK_HEADERS_ADAPTER_TOKEN,
  }),
  { virtual: true },
);

jest.mock('src/modules/auth', () => ({
  __esModule: true,
  AUTH_SERVICE_DI: MOCK_AUTH_SERVICE_TOKEN,
}));

import { TelemetryIoAdapter } from '../adapters/telemetry-io.adapter';
import { WsMicroserviceBuilder } from './ws.microservice.builder';

describe(WsMicroserviceBuilder.name, () => {
  let mockApp: jest.Mocked<INestApplication>;
  let mockDefaultHeadersAdapter: any;
  let mockCustomHeadersAdapter: any;
  let mockAuthService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDefaultHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({ requestId: 'default-id' }),
    };

    mockCustomHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({ custom: true }),
    };

    mockAuthService = {
      authenticate: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
      }),
    };

    mockApp = {
      get: jest.fn().mockImplementation((token: unknown) => {
        if (token === MOCK_HEADERS_ADAPTER_TOKEN) {
          return mockDefaultHeadersAdapter;
        }

        if (token === MOCK_AUTH_SERVICE_TOKEN) {
          return mockAuthService;
        }

        return undefined;
      }),
      useWebSocketAdapter: jest.fn(),
    } as unknown as jest.Mocked<INestApplication>;
  });

  it('должен инициализировать TelemetryIoAdapter с конфигурацией и зависимостями из DI', () => {
    const mockServerOptions: Partial<ServerOptions> = {
      cors: { origin: '*' },
      transports: ['websocket'],
    };

    WsMicroserviceBuilder.setup(mockApp, {
      serverOptions: mockServerOptions,
    });

    expect(mockApp.get).toHaveBeenCalledWith(MOCK_HEADERS_ADAPTER_TOKEN);
    expect(mockApp.get).toHaveBeenCalledWith(MOCK_AUTH_SERVICE_TOKEN);
    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];

    expect(passedAdapter).toBeInstanceOf(TelemetryIoAdapter);
    expect((passedAdapter as any).serverConfigOptions).toEqual({
      ...mockServerOptions,
      checkAuthConnect: undefined,
    });
    expect((passedAdapter as any).headersAdapter).toBe(mockDefaultHeadersAdapter);
    expect((passedAdapter as any).authService).toBe(mockAuthService);
  });

  it('должен использовать кастомный headersAdapter, если он передан в опциях', () => {
    WsMicroserviceBuilder.setup(mockApp, {
      headersAdapter: mockCustomHeadersAdapter,
    });

    expect(mockApp.get).not.toHaveBeenCalledWith(MOCK_HEADERS_ADAPTER_TOKEN);
    expect(mockApp.get).toHaveBeenCalledWith(MOCK_AUTH_SERVICE_TOKEN);
    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];

    expect((passedAdapter as any).headersAdapter).toBe(mockCustomHeadersAdapter);
    expect((passedAdapter as any).authService).toBe(mockAuthService);
  });

  it('должен корректно обрабатывать отсутствие опций', () => {
    WsMicroserviceBuilder.setup(mockApp);

    expect(mockApp.get).toHaveBeenCalledWith(MOCK_HEADERS_ADAPTER_TOKEN);
    expect(mockApp.get).toHaveBeenCalledWith(MOCK_AUTH_SERVICE_TOKEN);
    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];

    expect(passedAdapter).toBeInstanceOf(TelemetryIoAdapter);
    expect((passedAdapter as any).serverConfigOptions).toEqual({
      checkAuthConnect: undefined,
    });
  });

  it('должен передавать checkAuthConnect в конфигурацию адаптера', () => {
    WsMicroserviceBuilder.setup(mockApp, {
      checkAuthConnect: false,
      serverOptions: {
        cors: { origin: '*' },
      },
    });

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];

    expect((passedAdapter as any).serverConfigOptions).toEqual({
      cors: { origin: '*' },
      checkAuthConnect: false,
    });
  });

  it('должен выбрасывать ошибку, если headersAdapter отсутствует в опциях и DI', () => {
    mockApp.get.mockImplementation((token: unknown) => {
      if (token === MOCK_AUTH_SERVICE_TOKEN) {
        return mockAuthService;
      }

      return undefined;
    });

    expect(() => {
      WsMicroserviceBuilder.setup(mockApp, {
        serverOptions: {},
      });
    }).toThrow(
      'Не удалось инициализировать WebSocket телеметрию. Адаптер заголовков не передан в опциях и отсутствует в DI-контейнере.',
    );

    expect(mockApp.useWebSocketAdapter).not.toHaveBeenCalled();
  });

  it('должен использовать переданный headersAdapter даже при отсутствии адаптера в DI', () => {
    mockApp.get.mockImplementation((token: unknown) => {
      if (token === MOCK_AUTH_SERVICE_TOKEN) {
        return mockAuthService;
      }

      return undefined;
    });

    WsMicroserviceBuilder.setup(mockApp, {
      headersAdapter: mockCustomHeadersAdapter,
    });

    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];

    expect((passedAdapter as any).headersAdapter).toBe(mockCustomHeadersAdapter);
  });
});

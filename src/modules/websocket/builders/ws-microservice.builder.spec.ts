/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { INestApplication } from '@nestjs/common';

const MOCK_SYMBOL_TOKEN = Symbol('HTTP_SERVER_HEADERS_ADAPTER_DI');

jest.mock('src/modules/elk-logger', () => {
  return {
    __esModule: true,
    TraceSpanHelper: {
      generateTraceId: jest.fn().mockReturnValue('generated_trace_id_32_chars_long'),
      generateSpanId: jest.fn().mockReturnValue('generated_span_id'),
    },
  };
});

jest.mock(
  'src/modules/http/http-server',
  () => ({
    __esModule: true,
    HTTP_SERVER_HEADERS_ADAPTER_DI: MOCK_SYMBOL_TOKEN,
  }),
  { virtual: true },
);

jest.mock(
  '../../http/http-server/constants/constants',
  () => ({
    __esModule: true,
    HTTP_SERVER_HEADERS_ADAPTER_DI: MOCK_SYMBOL_TOKEN,
  }),
  { virtual: true },
);

import { TelemetryIoAdapter } from '../adapters/telemetry-io.adapter';
import { WsMicroserviceBuilder } from './ws-microservice.builder';

describe(WsMicroserviceBuilder.name, () => {
  let mockApp: jest.Mocked<INestApplication>;
  let mockDefaultHeadersAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDefaultHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({}),
    };

    mockApp = {
      get: jest.fn().mockImplementation((token) => {
        if (token === MOCK_SYMBOL_TOKEN || String(token).includes('HTTP_SERVER_HEADERS_ADAPTER_DI')) {
          return mockDefaultHeadersAdapter;
        }
        return null;
      }),
      useWebSocketAdapter: jest.fn(),
    } as unknown as jest.Mocked<INestApplication>;
  });

  it('должен успешно инициализировать и подключить TelemetryIoAdapter, используя дефолтный адаптер из DI', () => {
    const mockServerOptions = {
      cors: { origin: '*' },
    };

    WsMicroserviceBuilder.setup(mockApp, {
      serverOptions: mockServerOptions,
    });

    expect(mockApp.get).toHaveBeenCalled();
    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];
    expect(passedAdapter).toBeInstanceOf(TelemetryIoAdapter);
    expect((passedAdapter as any).serverConfigOptions).toEqual(mockServerOptions);
  });

  it('должен использовать кастомный headersAdapter, если пользователь явно передал его в опциях', () => {
    const mockCustomHeadersAdapter = {
      adapt: jest.fn().mockReturnValue({ custom: true }),
    };

    WsMicroserviceBuilder.setup(mockApp, {
      headersAdapter: mockCustomHeadersAdapter as any,
    });

    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];
    expect((passedAdapter as any).headersAdapter).toBe(mockCustomHeadersAdapter);
  });

  it('должен корректно обрабатывать отсутствие опций (options === undefined) и подставлять пустой объект конфигурации', () => {
    WsMicroserviceBuilder.setup(mockApp);

    expect(mockApp.get).toHaveBeenCalled();
    expect(mockApp.useWebSocketAdapter).toHaveBeenCalledTimes(1);

    const passedAdapter = mockApp.useWebSocketAdapter.mock.calls[0][0];
    expect((passedAdapter as any).serverConfigOptions).toEqual({});
  });

  it('должен выбрасывать Error, если адаптер заголовков отсутствует и в опциях, и в DI-контейнере NestJS', () => {
    mockApp.get.mockReturnValueOnce(undefined);

    expect(() => {
      WsMicroserviceBuilder.setup(mockApp, { serverOptions: {} });
    }).toThrow();

    expect(mockApp.useWebSocketAdapter).not.toHaveBeenCalled();
  });
});

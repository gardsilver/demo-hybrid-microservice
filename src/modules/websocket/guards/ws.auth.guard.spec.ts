/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthStatus } from 'src/modules/auth';
import { isSkipped } from 'src/modules/common';
import { GeneralAsyncContext } from 'src/modules/common/context';

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('gen-id'),
    generateSpanId: jest.fn().mockReturnValue('gen-span'),
  },
}));

jest.mock('src/modules/common', () => {
  const original = jest.requireActual('src/modules/common');
  return {
    ...original,
    isSkipped: jest.fn().mockReturnValue(false),
    BaseHeadersHelper: {
      ...original.BaseHeadersHelper,
      searchValue: jest.fn().mockReturnValue({ value: undefined }),
    },
  };
});

import { HttHeadersHelper } from 'src/modules/http/http-common/helpers/http.headers.helper';
import { HttpAuthHelper } from 'src/modules/http/http-common/helpers/http.auth.helper';
import { WsHelper } from '../helpers/ws.helper';
import { WsPacketHelper } from '../helpers/ws.packet.helper';
import { WsAuthGuard } from './ws.auth.guard';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let mockAuthService: any;
  let mockReflector: jest.Mocked<Reflector>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockSocketClient: any;
  let spyHttpAuthToken: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(HttHeadersHelper, 'normalize').mockImplementation((headers: any) => headers);

    spyHttpAuthToken = jest.spyOn(HttpAuthHelper, 'token');

    mockAuthService = {
      authenticate: jest.fn().mockResolvedValue({ status: AuthStatus.SUCCESS }),
    };

    mockReflector = {
      get: jest.fn(),
    } as any;

    mockSocketClient = {
      id: 'ws-session-secure-111',
      handshake: {
        headers: { cookie: 'authorization=Bearer%20mock-jwt-token' },
      },
      data: {},
    };

    mockContext = {
      getType: jest.fn().mockReturnValue('ws'),
      getClass: jest.fn().mockReturnValue({ name: 'MainWebSocketGateway' }),
      getHandler: jest.fn().mockReturnValue({ name: 'handleMessage' }),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockSocketClient),
        getData: jest.fn().mockReturnValue(['askMessage', { text: 'Hello' }]),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;

    jest.spyOn(WsHelper, 'isWs').mockReturnValue(true);
    jest.spyOn(GeneralAsyncContext.instance, 'get').mockImplementation((key) => {
      const map: Record<string, string> = { traceId: 't-id-999', spanId: 's-id-888' };
      return map[key];
    });

    (isSkipped as jest.Mock).mockReturnValue(false);

    guard = new WsAuthGuard(mockAuthService, mockReflector);
  });

  it('должен мгновенно вернуть true и пропустить выполнение, если контекст не является WebSocket (например, HTTP)', async () => {
    jest.spyOn(WsHelper, 'isWs').mockReturnValueOnce(false);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockAuthService.authenticate).not.toHaveBeenCalled();
  });

  it('Сценарий 1: Успешная авторизация — токен извлечен из Cookies, провалидирован, и данные сохранены в сокет', async () => {
    spyHttpAuthToken.mockReturnValueOnce('mock-jwt-token');

    jest.spyOn(WsPacketHelper, 'parse').mockReturnValueOnce({
      eventName: 'askMessage',
      payload: { text: 'Hello' },
      hasAck: false,
      ackCallback: undefined,
    });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockAuthService.authenticate).toHaveBeenCalledWith('mock-jwt-token');
    expect(mockSocketClient.data.authInfo).toEqual({ status: AuthStatus.SUCCESS });
  });

  it('Сценарий 2: Отказ в авторизации — authService вернул статус VERIFY_FAILED', async () => {
    spyHttpAuthToken.mockReturnValueOnce('invalid-token');
    mockAuthService.authenticate.mockResolvedValueOnce({ status: AuthStatus.VERIFY_FAILED });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(false);
    expect(mockSocketClient.data.authInfo.status).toBe(AuthStatus.VERIFY_FAILED);
  });

  it('Сценарий 3: Поддержка декоратора пропуска — должен вернуть true, если для метода сработал механизм @SkipAuth', async () => {
    spyHttpAuthToken.mockReturnValueOnce('expired-token');
    mockAuthService.authenticate.mockResolvedValueOnce({ status: AuthStatus.VERIFY_FAILED });

    (isSkipped as jest.Mock).mockReturnValueOnce(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockSocketClient.data.authInfo.status).toBe(AuthStatus.VERIFY_FAILED);
  });

  it('Сценарий 4: Безопасность при отсутствии инициализации client.data — должен создать пустой объект и записать authInfo', async () => {
    spyHttpAuthToken.mockReturnValueOnce('token-xyz');
    mockSocketClient.data = undefined;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockSocketClient.data).toBeDefined();
    expect(mockSocketClient.data.authInfo).toBeDefined();
  });
});

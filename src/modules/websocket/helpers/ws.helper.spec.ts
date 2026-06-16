/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ArgumentsHost } from '@nestjs/common';
import { WsHelper } from './ws.helper';

describe('WsHelper.isWs', () => {
  let mockContext: jest.Mocked<ArgumentsHost>;
  let mockSocketClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocketClient = {
      id: 'ws-session-id-777',
      handshake: {
        headers: {},
      },
    };

    mockContext = {
      getType: jest.fn().mockReturnValue('ws'),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockImplementation(() => mockSocketClient),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;
  });

  it('должен вернуть true, если контекст имеет тип "ws" и содержит валидный Socket.io клиент', () => {
    const result = WsHelper.isWs(mockContext);

    expect(result).toBe(true);
    expect(mockContext.getType).toHaveBeenCalledTimes(1);
    expect(mockContext.switchToWs).toHaveBeenCalledTimes(1);
  });

  it('должен вернуть false, если тип контекста NestJS отличается от "ws" (например, "http" или "rpc")', () => {
    mockContext.getType.mockReturnValueOnce('http');
    const result = WsHelper.isWs(mockContext);

    expect(result).toBe(false);

    expect(mockContext.switchToWs).not.toHaveBeenCalled();
  });

  it('должен вернуть false, если объект клиента сокета поврежден или не содержит легитимных свойств сокета', () => {
    mockSocketClient = {
      someRandomProperty: 'value',
    };

    const result = WsHelper.isWs(mockContext);

    expect(result).toBe(false);
  });

  it('должен вернуть false, если клиент сокета равен null или undefined', () => {
    mockContext.switchToWs.mockReturnValueOnce({
      getClient: jest.fn().mockReturnValue(null),
    } as any);

    expect(WsHelper.isWs(mockContext)).toBe(false);
  });

  it('должен безопасно вернуть false в блоке catch, если вызов switchToWs() выбросил runtime-исключение', () => {
    mockContext.switchToWs.mockImplementationOnce(() => {
      throw new Error('NestJS Context Conversion Crash');
    });

    const result = WsHelper.isWs(mockContext);

    expect(result).toBe(false);
  });
});

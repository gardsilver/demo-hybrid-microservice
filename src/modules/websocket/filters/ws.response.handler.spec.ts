/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { WsResponseHandler } from './ws.response.handler';
import { WsPacketHelper } from '../helpers/ws.packet.helper';

describe('WsResponseHandler', () => {
  let handler: WsResponseHandler;
  let mockLoggerBuilder: any;
  let mockLogger: any;
  let mockContext: jest.Mocked<ArgumentsHost>;
  let mockSocketClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockLoggerBuilder = {
      build: jest.fn().mockReturnValue(mockLogger),
    };

    mockSocketClient = {
      id: 'test-socket-123',
      handshake: { url: '/ws-chat' },
    };

    mockContext = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockSocketClient),
        getData: jest.fn().mockReturnValue(['askMessage', { text: 'hello' }]),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;

    jest.spyOn(GeneralAsyncContext.instance, 'get').mockImplementation((key) => {
      const map: Record<string, string> = { traceId: 't-1', spanId: 's-1' };
      return map[key];
    });

    handler = new WsResponseHandler(mockLoggerBuilder);
  });

  it('Сценарий 1: Обработка WsException — должен классифицировать как предупреждение (warn) с маркером BAD', () => {
    const mockWsException = new WsException('Room size limit exceeded');
    jest
      .spyOn(WsPacketHelper, 'parse')
      .mockReturnValue({ eventName: 'join', payload: {}, hasAck: false, ackCallback: undefined });

    const result = handler.handleError(mockContext, mockWsException);

    expect(result).toBe(mockWsException);
    expect(mockLoggerBuilder.build).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith('WS Response bad', expect.any(Object));
  });

  it('Сценарий 2: Обработка сырого системного Error — маппинг в WsException и запись с маркером ERROR', () => {
    const mockSystemError = new Error('Redis broker connection closed');

    const result = handler.handleError(mockContext, mockSystemError);

    expect(result).toBeInstanceOf(WsException);
    expect(result.message).toBe('Redis broker connection closed');
    expect(mockLogger.error).toHaveBeenCalledWith('WS Response error', expect.any(Object));
  });

  it('Сценарий 3: Обработка невалидных объектов исключений (строк) — безопасный фолбек к системной ошибке', () => {
    const result = handler.handleError(mockContext, 'Unexpected text crash');

    expect(result).toBeInstanceOf(WsException);
    expect(result.message).toBe('Internal WebSocket server error');
    expect(mockLogger.error).toHaveBeenCalledWith('WS Response error', expect.any(Object));
  });
});

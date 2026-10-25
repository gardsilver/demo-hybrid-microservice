/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */

import { context as otelContext } from '@opentelemetry/api';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { WsConnectionContextHelper } from './ws.connection-context.helper';
import { Socket } from 'socket.io';
import { AuthStatus, IAuthInfo } from 'src/modules/auth';
import { IWsConnectionData, IWsContextTelemetry } from '../types/types';

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');

  return {
    ...actual,
    context: {
      ...actual.context,
      with: jest.fn((_context: unknown, callback: () => unknown) => callback()),
    },
  };
});

jest.mock('src/modules/common/context', () => ({
  GeneralAsyncContext: {
    define: jest.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor),
    instance: {
      runWithContext: jest.fn((callback: () => unknown) => callback()),
      runWithContextAsync: jest.fn((callback: () => Promise<unknown>) => callback()),
    },
  },
}));

describe('WsConnectionContextHelper', () => {
  let mockClient: Socket;
  let mockTelemetry: IWsContextTelemetry;
  let mockAuthInfo: IAuthInfo;

  const mockOtelContext = { contextId: 'otel-context-1' };
  const mockAsyncContext = {
    traceId: 'a'.repeat(32),
    spanId: 'b'.repeat(16),
    parentSpanId: 'c'.repeat(16),
    initialSpanId: 'c'.repeat(16),
    requestId: 'custom-req-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTelemetry = {
      context: mockOtelContext as any,
      span: {} as any,
      asyncContext: mockAsyncContext as any,
    };

    mockAuthInfo = {
      status: AuthStatus.SUCCESS,
    } as IAuthInfo;

    mockClient = {
      id: 'ws-test-socket-id-123',
      data: {},
    } as Socket;
  });

  describe('setContextTelemetry / getContextTelemetry', () => {
    it('должен сохранять и возвращать telemetry-контекст подключения', () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      expect(WsConnectionContextHelper.getContextTelemetry(mockClient)).toBe(mockTelemetry);

      expect((mockClient.data as IWsConnectionData).telemetry).toBe(mockTelemetry);
    });

    it('должен возвращать undefined, если telemetry-контекст не установлен', () => {
      expect(WsConnectionContextHelper.getContextTelemetry(mockClient)).toBeUndefined();
    });
  });

  describe('setAuthInfo / getAuthInfo', () => {
    it('должен сохранять и возвращать информацию об аутентификации', () => {
      WsConnectionContextHelper.setAuthInfo(mockClient, mockAuthInfo);

      expect(WsConnectionContextHelper.getAuthInfo(mockClient)).toBe(mockAuthInfo);

      expect((mockClient.data as IWsConnectionData).authInfo).toBe(mockAuthInfo);
    });

    it('должен возвращать undefined, если информация об аутентификации не установлена', () => {
      expect(WsConnectionContextHelper.getAuthInfo(mockClient)).toBeUndefined();
    });
  });

  describe('getRequiredContext', () => {
    it('должен возвращать установленный telemetry-контекст', () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      expect(WsConnectionContextHelper.getRequiredContext(mockClient)).toBe(mockTelemetry);
    });

    it('должен выбрасывать ошибку, если telemetry-контекст не инициализирован', () => {
      expect(() => WsConnectionContextHelper.getRequiredContext(mockClient)).toThrow(
        'WebSocket telemetry context is not initialized for socket ws-test-socket-id-123',
      );
    });
  });

  describe('runWithContext', () => {
    it('должен выполнять синхронную операцию внутри контекста подключения', () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      const executionBlock = jest.fn().mockReturnValue('operation-success');

      const result = WsConnectionContextHelper.runWithContext(mockClient, executionBlock);

      expect(result).toBe('operation-success');

      expect(otelContext.with).toHaveBeenCalledWith(mockOtelContext, expect.any(Function));

      expect(GeneralAsyncContext.instance.runWithContext).toHaveBeenCalledWith(
        executionBlock,
        mockAsyncContext,
        'WS CONNECTION: [ws-test-socket-id-123]',
      );

      expect(executionBlock).toHaveBeenCalledTimes(1);
    });

    it('должен пробрасывать исключение синхронной операции', () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      const runtimeError = new Error('Operation failed');

      const executionBlock = jest.fn(() => {
        throw runtimeError;
      });

      expect(() => WsConnectionContextHelper.runWithContext(mockClient, executionBlock)).toThrow(runtimeError);
    });

    it('должен выбрасывать ошибку, если контекст не инициализирован', () => {
      const executionBlock = jest.fn();

      expect(() => WsConnectionContextHelper.runWithContext(mockClient, executionBlock)).toThrow(
        'WebSocket telemetry context is not initialized for socket ws-test-socket-id-123',
      );

      expect(executionBlock).not.toHaveBeenCalled();
    });
  });

  describe('runWithContextAsync', () => {
    it('должен выполнять асинхронную операцию внутри контекста подключения', async () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      const executionBlock = jest.fn().mockResolvedValue('async-operation-success');

      const result = await WsConnectionContextHelper.runWithContextAsync(mockClient, executionBlock);

      expect(result).toBe('async-operation-success');

      expect(otelContext.with).toHaveBeenCalledWith(mockOtelContext, expect.any(Function));

      expect(GeneralAsyncContext.instance.runWithContextAsync).toHaveBeenCalledWith(
        executionBlock,
        mockAsyncContext,
        'WS CONNECTION: [ws-test-socket-id-123]',
      );

      expect(executionBlock).toHaveBeenCalledTimes(1);
    });

    it('должен пробрасывать ошибку асинхронной операции', async () => {
      WsConnectionContextHelper.setContextTelemetry(mockClient, mockTelemetry);

      const runtimeError = new Error('Async operation failed');

      const executionBlock = jest.fn().mockRejectedValue(runtimeError);

      await expect(WsConnectionContextHelper.runWithContextAsync(mockClient, executionBlock)).rejects.toThrow(
        'Async operation failed',
      );
    });

    it('должен отклонять выполнение, если контекст не инициализирован', async () => {
      const executionBlock = jest.fn().mockResolvedValue('unexpected');

      expect(() => WsConnectionContextHelper.runWithContextAsync(mockClient, executionBlock)).toThrow(
        'WebSocket telemetry context is not initialized for socket ws-test-socket-id-123',
      );

      expect(executionBlock).not.toHaveBeenCalled();
    });
  });
});

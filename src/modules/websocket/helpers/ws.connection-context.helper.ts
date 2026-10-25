import { Socket } from 'socket.io';
import { context as otelContext } from '@opentelemetry/api';

import { GeneralAsyncContext } from 'src/modules/common/context';
import { IAuthInfo } from 'src/modules/auth';
import { IWsConnectionData, IWsContextTelemetry } from '../types/types';

export abstract class WsConnectionContextHelper {
  public static setContextTelemetry(client: Socket, telemetry: IWsContextTelemetry): void {
    const data = client.data as IWsConnectionData;
    data.telemetry = telemetry;
  }

  public static getContextTelemetry(client: Socket): IWsContextTelemetry | undefined {
    return (client.data as IWsConnectionData).telemetry;
  }

  public static setAuthInfo(client: Socket, authInfo: IAuthInfo): void {
    const data = client.data as IWsConnectionData;
    data.authInfo = authInfo;
  }

  public static getAuthInfo(client: Socket): IAuthInfo | undefined {
    return (client.data as IWsConnectionData).authInfo;
  }

  /**
   * Возвращает telemetry-контекст или выбрасывает ошибку,
   * если контекст ещё не был инициализирован.
   */
  public static getRequiredContext(client: Socket): IWsContextTelemetry {
    const telemetry = this.getContextTelemetry(client);

    if (!telemetry) {
      throw new Error(`WebSocket telemetry context is not initialized for socket ${client.id}`);
    }

    return telemetry;
  }

  /**
   * Выполняет синхронную или возвращающую произвольный результат операцию
   * в контексте WebSocket-подключения.
   */
  public static runWithContext<R>(client: Socket, executionBlock: () => R): R {
    const telemetry = this.getRequiredContext(client);

    return otelContext.with(telemetry.context, () =>
      GeneralAsyncContext.instance.runWithContext(
        executionBlock,
        telemetry.asyncContext,
        `WS CONNECTION: [${client.id}]`,
      ),
    );
  }

  /**
   * Выполняет асинхронную операцию в контексте WebSocket-подключения.
   *
   * Контекст сохраняется на протяжении выполнения Promise.
   */
  public static runWithContextAsync<R>(client: Socket, executionBlock: () => Promise<R>): Promise<R> {
    const telemetry = this.getRequiredContext(client);

    return otelContext.with(telemetry.context, () =>
      GeneralAsyncContext.instance.runWithContextAsync(
        executionBlock,
        telemetry.asyncContext,
        `WS CONNECTION: [${client.id}]`,
      ),
    );
  }
}

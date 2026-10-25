import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { context as otelContext, SpanStatusCode, trace, TraceFlags } from '@opentelemetry/api';
import { Server, ServerOptions, Socket } from 'socket.io';

import { AuthStatus, IAuthService } from 'src/modules/auth';
import {
  HttpGeneralAsyncContextHeaderNames,
  HttHeadersHelper,
  HttpAuthHelper,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { BaseHeadersHelper } from 'src/modules/common/helpers/base.headers.helper';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';

import { WsPacketHelper } from '../helpers/ws.packet.helper';
import { WsConnectionContextHelper } from '../helpers/ws.connection-context.helper';

export class TelemetryIoAdapter extends IoAdapter {
  private readonly tracer = trace.getTracer('websocket-platform-transport');

  constructor(
    appContext: INestApplicationContext,
    private readonly serverConfigOptions: Partial<ServerOptions> & { checkAuthConnect?: boolean },
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    private readonly authService: IAuthService,
  ) {
    super(appContext);
  }

  public override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const checkAuthConnect: boolean = this.serverConfigOptions?.checkAuthConnect === false ? false : true;

    const serverOptions: Partial<ServerOptions> = {
      ...options,
      ...this.serverConfigOptions,
    };

    const server: Server = super.createIOServer(port, serverOptions);

    /**
     * Middleware 1: handshake.
     *
     * 1. Создаёт connection span.
     * 2. Инициализирует GeneralAsyncContext.
     * 3. Выполняет JWT-аутентификацию внутри контекста.
     * 4. Отклоняет подключение, если статус не SUCCESS.
     */
    server.use((client: Socket, next) => {
      const headers = HttHeadersHelper.normalize(client.handshake.headers);

      const traceId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.TRACE_ID);

      const parentSpanId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.SPAN_ID);

      const parentContext = trace.setSpanContext(otelContext.active(), {
        traceId: (traceId || TraceSpanHelper.generateTraceId()).padStart(32, '0'),
        spanId: (parentSpanId || TraceSpanHelper.generateSpanId()).padStart(16, '0'),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: Boolean(traceId),
      });

      const connectionSpan = this.tracer.startSpan(
        'WS CONNECTION',
        {
          attributes: {
            'messaging.system': 'websocket',
            'messaging.operation': 'connect',
            'websocket.socketId': client.id,
          },
        },
        parentContext,
      );

      const connectionContext = trace.setSpan(parentContext, connectionSpan);

      const asyncContext: IGeneralAsyncContext = {
        ...this.headersAdapter.adapt(headers),
        traceId: connectionSpan.spanContext().traceId,
        spanId: connectionSpan.spanContext().spanId,
        parentSpanId: parentSpanId || '',
        initialSpanId: parentSpanId || '',
      };

      WsConnectionContextHelper.setContextTelemetry(client, {
        context: connectionContext,
        span: connectionSpan,
        asyncContext,
      });

      const rejectConnection = (message: string): void => {
        connectionSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message,
        });

        connectionSpan.end();

        const error = new Error('WebSocket connection rejected') as Error & {
          data?: { code: string; message: string };
        };

        error.data = {
          code: 'UNAUTHORIZED',
          message,
        };

        next(error);
      };

      otelContext.with(connectionContext, () => {
        GeneralAsyncContext.instance.runWithContext(() => {
          const jwtToken = HttpAuthHelper.token(headers);

          void this.authService
            .authenticate(jwtToken ?? null)
            .then((auth) => {
              if (checkAuthConnect && auth.status !== AuthStatus.SUCCESS) {
                rejectConnection(`WebSocket authentication failed: ${auth.status}`);
                return;
              }

              WsConnectionContextHelper.setAuthInfo(client, auth);

              connectionSpan.setStatus({
                code: SpanStatusCode.OK,
              });

              next();
            })
            .catch((error: unknown) => {
              const exception = error instanceof Error ? error : new Error('Unexpected WebSocket authentication error');

              connectionSpan.recordException(exception);

              rejectConnection('WebSocket authentication failed');
            });
        }, asyncContext);
      });
    });

    /**
     * Middleware 2: регистрация обработки пакетов.
     *
     * Создаёт отдельный span для каждого входящего события.
     */
    server.use((client: Socket, next) => {
      client.use((packet, eventNext) => {
        const eventName = WsPacketHelper.getEventName(packet);

        if (!eventName) {
          eventNext();
          return;
        }

        const telemetry = WsConnectionContextHelper.getRequiredContext(client);

        if (!telemetry) {
          eventNext(new Error('WebSocket telemetry context is missing'));
          return;
        }

        const { context: connectionContext, asyncContext, span: connectionSpan } = telemetry;

        const eventSpan = this.tracer.startSpan(
          `WS EVENT: [${eventName}]`,
          {
            attributes: {
              'messaging.system': 'websocket',
              'messaging.operation': 'process',
              'messaging.destination': eventName,
              'websocket.socketId': client.id,
            },
          },
          connectionContext,
        );

        const eventContext = trace.setSpan(connectionContext, eventSpan);

        const eventAsyncContext: IGeneralAsyncContext = {
          ...asyncContext,
          traceId: eventSpan.spanContext().traceId,
          spanId: eventSpan.spanContext().spanId,
          parentSpanId: connectionSpan.spanContext().spanId,
        };

        otelContext.with(eventContext, () => {
          GeneralAsyncContext.instance.runWithContext(() => {
            eventNext();
          }, eventAsyncContext);
        });
      });

      next();
    });

    return server;
  }
}

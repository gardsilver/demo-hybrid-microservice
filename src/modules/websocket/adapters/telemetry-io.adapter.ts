/* eslint-disable @typescript-eslint/no-explicit-any */
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { HttpGeneralAsyncContextHeaderNames, HttHeadersHelper } from 'src/modules/http/http-common';
import { BaseHeadersHelper } from 'src/modules/common/helpers/base.headers.helper';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { WsPacketHelper } from '../helpers/ws.packet.helper';

export class TelemetryIoAdapter extends IoAdapter {
  constructor(
    appContext: INestApplicationContext,
    private readonly serverConfigOptions: Partial<ServerOptions>,
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
  ) {
    super(appContext);
  }

  public override createIOServer(port: number, options?: any): Server {
    const serverOptions: Partial<ServerOptions> = {
      ...options,
      ...this.serverConfigOptions,
    };

    const server: Server = super.createIOServer(port, serverOptions);

    server.use((client: Socket, next) => {
      client.use((packet, eventNext) => {
        const eventName = WsPacketHelper.getEventName(packet);
        if (!eventName) {
          return eventNext();
        }

        const headers = HttHeadersHelper.normalize(client.handshake.headers);
        const traceId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.TRACE_ID);
        const parentSpanId = BaseHeadersHelper.searchHeaderAsString(
          headers,
          HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        );

        const eventTracer = trace.getTracer('websocket-platform-transport');
        const eventOperationName = `WS EVENT: [${eventName}]`;

        const targetTraceId = traceId || TraceSpanHelper.generateTraceId();
        const targetSpanId = parentSpanId || TraceSpanHelper.generateSpanId();

        const eventParentContext = trace.setSpanContext(otelContext.active(), {
          traceId: targetTraceId.padStart(32, '0'),
          spanId: targetSpanId.padStart(16, '0'),
          traceFlags: TraceFlags.SAMPLED,
          isRemote: !!traceId,
        });

        const eventSpan = eventTracer.startSpan(
          eventOperationName,
          {
            attributes: {
              'messaging.system': 'websocket',
              'messaging.operation': 'process',
              'messaging.destination': eventName,
              'websocket.socketId': client.id,
            },
          },
          eventParentContext,
        );

        const eventActiveContext = trace.setSpan(eventParentContext, eventSpan);

        const eventEnrichedContext: IGeneralAsyncContext = {
          ...this.headersAdapter.adapt(headers),
          traceId: eventSpan.spanContext().traceId,
          spanId: eventSpan.spanContext().spanId,
          parentSpanId: parentSpanId || '',
          initialSpanId: parentSpanId || '',
        };

        otelContext.with(eventActiveContext, () => {
          GeneralAsyncContext.instance.runWithContext(() => {
            try {
              const fullBusinessContext = this.headersAdapter.adapt(headers);

              GeneralAsyncContext.instance.setMultiple({
                ...fullBusinessContext,
              });

              eventNext();

              eventSpan.setStatus({ code: SpanStatusCode.OK });
              eventSpan.end();
            } catch (error: any) {
              eventSpan.recordException(error);
              eventSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
              eventSpan.end();

              eventNext(error);
            }
          }, eventEnrichedContext);
        });
      });

      return next();
    });

    return server;
  }
}

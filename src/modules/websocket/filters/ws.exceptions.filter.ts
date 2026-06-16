import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Socket } from 'socket.io';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { LoggerMarkers } from 'src/modules/common';
import { WsHelper } from '../helpers/ws.helper';
import { WsResponseHandler } from './ws.response.handler';

@Catch()
export class WsErrorResponseFilter implements ExceptionFilter {
  constructor(private readonly responseHandler: WsResponseHandler) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    if (!WsHelper.isWs(host)) {
      return;
    }

    const resolvedError = this.responseHandler.handleError(host, exception, {
      module: `${WsErrorResponseFilter.name}.catch`,
      markers: [LoggerMarkers.INTERNAL],
    });

    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(exception instanceof Error ? exception : new Error(resolvedError.message));
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: resolvedError.message,
      });
    }

    client.emit('exception', {
      status: 'error',
      message: resolvedError.message,
    });
  }
}

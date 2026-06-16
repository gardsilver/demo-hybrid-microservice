import { ArgumentsHost, Inject, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerServiceBuilder,
  ILogFields,
  LogFieldsHelper,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { LoggerMarkers } from 'src/modules/common';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { WsPacketHelper } from '../helpers/ws.packet.helper';

export interface IWsErrorStructure {
  status: string;
  message: string;
}

@Injectable()
export class WsResponseHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  public loggingResponse(isSystemError: boolean, fieldsLogs?: ILogFields): void {
    const logger = this.loggerBuilder.build({
      module: `${WsResponseHandler.name}`,
      ...fieldsLogs,
    });

    if (isSystemError) {
      logger.error('WS Response error', {
        markers: [LoggerMarkers.WS, LoggerMarkers.RESPONSE, LoggerMarkers.ERROR],
      });
    } else {
      logger.warn('WS Response bad', {
        markers: [LoggerMarkers.WS, LoggerMarkers.RESPONSE, LoggerMarkers.BAD],
      });
    }
  }

  public handleError(context: ArgumentsHost, exception: unknown, fieldsLogs?: ILogFields): WsException {
    const ctx = context.switchToWs();
    const client = ctx.getClient<Socket>();
    const rawPacket = ctx.getData();

    const parsedPacket = WsPacketHelper.parse(rawPacket);

    const asyncContext: IGeneralAsyncContext = {
      traceId: GeneralAsyncContext.instance.get('traceId') || '',
      spanId: GeneralAsyncContext.instance.get('spanId') || '',
      parentSpanId: GeneralAsyncContext.instance.get('parentSpanId') || '',
      initialSpanId: GeneralAsyncContext.instance.get('initialSpanId') || '',
      requestId: GeneralAsyncContext.instance.get('requestId'),
      correlationId: GeneralAsyncContext.instance.get('correlationId'),
    };

    const ts = TraceSpanBuilder.build(asyncContext);

    let resolvedError: WsException;
    let errorMessage: string;
    let isSystemError = false;

    if (exception instanceof WsException) {
      resolvedError = exception;
      const errorResponse = exception.getError();
      errorMessage =
        typeof errorResponse === 'object' && errorResponse !== null
          ? JSON.stringify(errorResponse)
          : String(errorResponse);
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      resolvedError = new WsException(errorMessage);
      isSystemError = true;
    } else {
      errorMessage = 'Internal WebSocket server error';
      resolvedError = new WsException(errorMessage);
      isSystemError = true;
    }

    const requestAsLog = {
      socketId: client.id,
      handshakeUrl: client.handshake.url,
      event: parsedPacket.eventName || 'Unknown',
      data: parsedPacket.payload,
    };

    const responseAsLog = {
      status: 'error',
      message: errorMessage,
    };

    this.loggingResponse(
      isSystemError,
      LogFieldsHelper.merge(fieldsLogs ?? {}, {
        ...ts,
        payload: {
          request: requestAsLog,
          response: responseAsLog,
          exception: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception,
          error: { message: resolvedError.message },
        },
      }),
    );

    return resolvedError;
  }
}

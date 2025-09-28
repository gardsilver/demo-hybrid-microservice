import { Observable } from 'rxjs';
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import { LoggerMarkers } from 'src/modules/common';
import { GrpcResponseHandler } from './grpc.response.handler';
import { GrpcHelper } from '../helpers/grpc.helper';

/**
 * ВНИМАНИЕ!
 * Не использовать в Hybrid конфигурации
 */
@Catch()
export class GrpcErrorResponseFilter extends BaseRpcExceptionFilter {
  constructor(private readonly responseHandler: GrpcResponseHandler) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    if (!GrpcHelper.isGrpc(host)) {
      return;
    }

    const error = this.responseHandler.handleError(exception, host, {
      markers: [LoggerMarkers.INTERNAL],
      module: `${GrpcErrorResponseFilter.name}.catch`,
    });

    return super.catch(error, host);
  }
}

import { Observable } from 'rxjs';
import { ArgumentsHost, Catch, ExceptionFilter, RpcExceptionFilter } from '@nestjs/common';
import { HttpErrorResponseFilter } from 'src/modules/http/http-server';
import { GrpcErrorResponseFilter } from 'src/modules/grpc/grpc-server';

@Catch()
export class HybridErrorResponseFilter implements ExceptionFilter, RpcExceptionFilter {
  constructor(
    private readonly httpErrorResponseFilter: HttpErrorResponseFilter,
    private readonly grpcErrorResponseFilter: GrpcErrorResponseFilter,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): any | Observable<any> {
    if (host.getType() === 'http') {
      this.httpErrorResponseFilter.catch(exception, host);

      return;
    }

    if (host.getType() === 'rpc') {
      return this.grpcErrorResponseFilter.catch(exception, host);
    }

    return;
  }
}

import { Observable } from 'rxjs';
import { ArgumentsHost, Catch, ExceptionFilter, RpcExceptionFilter } from '@nestjs/common';
import { HttpErrorResponseFilter } from 'src/modules/http/http-server';
import { GrpcErrorResponseFilter, GrpcHelper } from 'src/modules/grpc/grpc-server';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class HybridErrorResponseFilter implements ExceptionFilter, RpcExceptionFilter {
  private readonly defaultRpcExceptionFilter: BaseRpcExceptionFilter;
  constructor(
    private readonly httpErrorResponseFilter: HttpErrorResponseFilter,
    private readonly grpcErrorResponseFilter: GrpcErrorResponseFilter,
  ) {
    this.defaultRpcExceptionFilter = new BaseRpcExceptionFilter();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): any | Observable<any> {
    if (host.getType() === 'http') {
      this.httpErrorResponseFilter.catch(exception, host);

      return;
    }

    if (GrpcHelper.isGrpc(host)) {
      return this.grpcErrorResponseFilter.catch(exception, host);
    }

    if (host.getType() === 'rpc') {
      return this.defaultRpcExceptionFilter.catch(exception, host);
    }

    return;
  }
}

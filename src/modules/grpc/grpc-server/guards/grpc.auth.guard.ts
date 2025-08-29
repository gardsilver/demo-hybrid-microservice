import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Metadata } from '@grpc/grpc-js';
import { AUTH_SERVICE_DI, AuthStatus, IAuthService } from 'src/modules/auth';
import {
  GeneralAsyncContext,
  getSkipInterceptors,
  IGeneralAsyncContext,
  IHeadersToContextAdapter,
} from 'src/modules/common';
import { GrpcAuthHelper, GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

@Injectable()
export class GrpcAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
    @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHeadersToContextAdapter<IGeneralAsyncContext>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'rpc') {
      return true;
    }

    const rpc = context.switchToRpc();
    const metadata = rpc.getContext<Metadata>();
    const headers = GrpcHeadersHelper.normalize(metadata.getMap());
    const jwtToken = GrpcAuthHelper.token(headers);

    let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
    }

    const auth = await GeneralAsyncContext.instance.runWithContextAsync(async () => {
      return await this.authService.authenticate(jwtToken);
    }, asyncContext);

    GrpcMetadataHelper.setAuthInfo(auth, metadata);

    if (
      getSkipInterceptors(context, this.reflector).All ||
      getSkipInterceptors(context, this.reflector).GrpcAuthGuard
    ) {
      return true;
    }

    return auth.status === AuthStatus.SUCCESS;
  }
}

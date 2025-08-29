import { Request } from 'express';
import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_SERVICE_DI, AuthStatus, IAuthService } from 'src/modules/auth';
import { GeneralAsyncContext, getSkipInterceptors, IGeneralAsyncContext } from 'src/modules/common';
import { HttHeadersHelper, HttpAuthHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { HttpRequestHelper } from '../helpers/http.request.helper';

@Injectable()
export class HttpAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    const headers = HttHeadersHelper.normalize(request.headers);
    const jwtToken = HttpAuthHelper.token(headers);

    let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      HttpRequestHelper.setAsyncContext(asyncContext, request);
    }

    HttpRequestHelper.setAsyncContext(asyncContext, request);

    const auth = await GeneralAsyncContext.instance.runWithContextAsync(async () => {
      return await this.authService.authenticate(jwtToken);
    }, asyncContext);

    HttpRequestHelper.setAuthInfo(auth, request);

    if (
      getSkipInterceptors(context, this.reflector).All ||
      getSkipInterceptors(context, this.reflector).HttpAuthGuard
    ) {
      return true;
    }

    return auth.status === AuthStatus.SUCCESS;
  }
}

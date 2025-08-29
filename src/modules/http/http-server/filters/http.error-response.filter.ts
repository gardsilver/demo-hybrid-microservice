import { Response, Request } from 'express';
import { ArgumentsHost, Catch, Inject } from '@nestjs/common';
import { IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { HttpResponseHandler } from './http.response.handler';
import { HttpResponseHelper } from '../helpers/http.response.helper';
import { HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from '../types/tokens';
import { IHttpHeadersResponseBuilder } from '../types/types';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttHeadersHelper } from '../../http-common';

@Catch()
export class HttpErrorResponseFilter {
  constructor(
    @Inject(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI)
    private readonly headersResponseBuilder: IHttpHeadersResponseBuilder,
    private readonly responseHandler: HttpResponseHandler,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const srcHeaders = HttHeadersHelper.normalize(request.headers);

    const resolvedError = this.responseHandler.handleError(host, exception, {
      module: `${HttpErrorResponseFilter.name}.catch`,
      markers: [LoggerMarkers.INTERNAL],
    });

    const asyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

    const tgtHeaders = this.headersResponseBuilder.build({
      asyncContext,
      headers: srcHeaders,
    });

    const response = ctx.getResponse<Response>();

    HttpResponseHelper.addHeaders(tgtHeaders, response);

    response.status(resolvedError.getStatus()).send(resolvedError.getResponse());
  }
}

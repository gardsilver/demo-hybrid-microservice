import { Injectable } from '@nestjs/common';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME, HttpHeadersBuilder } from 'src/modules/http/http-common';
import { IHttpHeadersBuilderOptions, IHttpHeadersRequestBuilder } from '../types/types';

@Injectable()
export class HttpHeadersRequestBuilder extends HttpHeadersBuilder implements IHttpHeadersRequestBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    options?: IHttpHeadersBuilderOptions,
  ): IHeaders {
    const headers = super.build(params, options);

    if (options?.authToken !== undefined && options.authToken.length) {
      headers[AUTHORIZATION_HEADER_NAME] = `${BEARER_NAME} ${options.authToken}`;
    }

    return headers;
  }
}

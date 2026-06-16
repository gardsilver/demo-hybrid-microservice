import { Injectable } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { HttHeadersHelper } from '../helpers/http.headers.helper';
import { IHttpHeadersBuilder, IHttpHeadersBuilderOptions } from '../types/types';
import { AUTHORIZATION_HEADER_NAME } from '../types/security.constants';

@Injectable()
export class HttpHeadersBuilder implements IHttpHeadersBuilder {
  public build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    _options?: IHttpHeadersBuilderOptions,
  ): IHeaders {
    const headers = params.headers ? { ...params.headers } : {};

    if (AUTHORIZATION_HEADER_NAME in headers) {
      delete headers[AUTHORIZATION_HEADER_NAME];
    }

    const tgt: IHeaders = {};

    const asyncContextKeys = ['traceId', 'spanId', 'correlationId', 'requestId'] as const;

    for (const key of asyncContextKeys) {
      const useHeaderName = HttHeadersHelper.nameAsHeaderName(key);
      if (useHeaderName === undefined) {
        continue;
      }

      let value: string | undefined;

      const asyncContextValue = params?.asyncContext?.[key];
      if (asyncContextValue !== undefined) {
        value = asyncContextValue.toString();
      } else if (useHeaderName in headers && headers[useHeaderName] !== undefined) {
        const headerValue = headers[useHeaderName];
        value = Array.isArray(headerValue) ? headerValue.join('-') : headerValue;
      }

      if (value !== undefined && value !== '') {
        tgt[useHeaderName] = value;
      }
    }

    return {
      ...headers,
      ...tgt,
    };
  }
}

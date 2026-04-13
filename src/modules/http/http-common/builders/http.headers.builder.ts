import { Injectable } from '@nestjs/common';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttHeadersHelper } from '../helpers/http.headers.helper';
import { IHttpHeadersBuilder } from '../types/types';
import { AUTHORIZATION_HEADER_NAME } from '../types/security.constants';

@Injectable()
export class HttpHeadersBuilder implements IHttpHeadersBuilder {
  public build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): IHeaders {
    const useZipkin: boolean = options?.useZipkin ?? false;

    const headers = params.headers ? { ...params.headers } : {};

    if (AUTHORIZATION_HEADER_NAME in headers) {
      delete headers[AUTHORIZATION_HEADER_NAME];
    }

    const tgt: IHeaders = {};

    const asyncContextKeys = ['traceId', 'spanId', 'correlationId', 'requestId'] as const;

    for (const key of asyncContextKeys) {
      const useHeaderName = HttHeadersHelper.nameAsHeaderName(key, useZipkin);
      if (useHeaderName === undefined) {
        continue;
      }

      const asZipkin = useZipkin && (key === 'traceId' || key === 'spanId');

      let value: string | undefined;

      const asyncContextValue = params?.asyncContext?.[key];
      if (asyncContextValue !== undefined) {
        value = asyncContextValue.toString();
      } else if (useHeaderName in headers && headers[useHeaderName] !== undefined) {
        const headerValue = headers[useHeaderName];
        value = Array.isArray(headerValue) ? headerValue.join('-') : headerValue;

        if (value !== '' && asZipkin) {
          value = TraceSpanHelper.formatToGuid(value);
        }
      }

      if (value !== undefined && value !== '') {
        if (options?.asArray) {
          tgt[useHeaderName] = value.split('-');
        } else {
          tgt[useHeaderName] = asZipkin ? TraceSpanHelper.formatToZipkin(value) : value;
        }
      }

      [HttHeadersHelper.nameAsHeaderName(key, false), HttHeadersHelper.nameAsHeaderName(key, true)].forEach(
        (headerName) => {
          if (headerName !== undefined && headerName in headers) {
            delete headers[headerName];
          }
        },
      );
    }

    return {
      ...headers,
      ...tgt,
    };
  }
}

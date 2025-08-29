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

    for (const key of ['traceId', 'spanId', 'correlationId', 'requestId']) {
      const useHeaderName = HttHeadersHelper.nameAsHeaderName(key, useZipkin);
      const asZipkin = useZipkin && ['traceId', 'spanId'].includes(key);

      let value: string;

      if (params?.asyncContext && key in params.asyncContext && params.asyncContext[key] !== undefined) {
        value = params.asyncContext[key] as string;
      } else if (useHeaderName in headers && headers[useHeaderName] !== undefined) {
        value = Array.isArray(headers[useHeaderName]) ? headers[useHeaderName].join('-') : headers[useHeaderName];

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
          if (headerName in headers) {
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

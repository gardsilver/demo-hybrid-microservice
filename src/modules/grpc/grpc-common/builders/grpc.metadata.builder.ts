import { Metadata } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { AUTHORIZATION_HEADER_NAME, HttHeadersHelper } from 'src/modules/http/http-common';
import { GrpcHeadersHelper } from '../helpers/grpc.headers.helper';
import { IGrpcMetadataBuilder } from '../types/types';

@Injectable()
export class GrpcMetadataBuilder implements IGrpcMetadataBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): Metadata {
    const useZipkin: boolean = options?.useZipkin ?? false;

    const headers: IHeaders = params.metadata ? GrpcHeadersHelper.normalize(params.metadata.getMap()) : {};

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

    const metadata = new Metadata();

    for (const [k, v] of Object.entries({
      ...headers,
      ...tgt,
    })) {
      if (Array.isArray(v)) {
        if (k.endsWith('-bin')) {
          metadata.set(k, Buffer.from(JSON.stringify(v), 'utf8'));
        } else {
          metadata.set(`${k}-bin`, Buffer.from(JSON.stringify(v), 'utf8'));
        }
      } else {
        if (k.endsWith('-bin')) {
          metadata.set(k, Buffer.from(v, 'utf8'));
        } else {
          metadata.set(k, v);
        }
      }
    }

    return metadata;
  }
}

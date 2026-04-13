import { Injectable } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { AUTHORIZATION_HEADER_NAME } from 'src/modules/http/http-common';
import { IKafkaHeadersBuilder } from '../types/types';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';
import { KafkaHeadersHelper } from '../helpers/kafka.headers.helper';

@Injectable()
export class KafkaHeadersBuilder implements IKafkaHeadersBuilder {
  build(
    params: { asyncContext: IKafkaAsyncContext; headers?: IHeaders },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): IHeaders {
    const useZipkin: boolean = options?.useZipkin ?? false;

    const headers = { ...params.headers };

    if (AUTHORIZATION_HEADER_NAME in headers) {
      delete headers[AUTHORIZATION_HEADER_NAME];
    }

    const tgt: IHeaders = {};

    const asyncContextKeys = [
      'traceId',
      'spanId',
      'correlationId',
      'requestId',
      'replyTopic',
      'replyPartition',
    ] as const;

    for (const key of asyncContextKeys) {
      const useHeaderName = KafkaHeadersHelper.nameAsHeaderName(key, useZipkin);
      if (useHeaderName === undefined) {
        continue;
      }

      const asZipkin = useZipkin && (key === 'traceId' || key === 'spanId');

      let value: string | undefined;

      const asyncContextValue = params.asyncContext?.[key];
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

      [KafkaHeadersHelper.nameAsHeaderName(key, false), KafkaHeadersHelper.nameAsHeaderName(key, true)].forEach(
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

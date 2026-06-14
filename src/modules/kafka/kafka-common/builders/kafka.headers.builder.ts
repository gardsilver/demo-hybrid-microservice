import { Injectable } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { AUTHORIZATION_HEADER_NAME } from 'src/modules/http/http-common';
import { IKafkaHeadersBuilder, IKafkaHeadersBuilderOptions } from '../types/types';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';
import { KafkaHeadersHelper } from '../helpers/kafka.headers.helper';

@Injectable()
export class KafkaHeadersBuilder implements IKafkaHeadersBuilder {
  build(
    params: { asyncContext: IKafkaAsyncContext; headers?: IHeaders },

    _options?: IKafkaHeadersBuilderOptions,
  ): IHeaders {
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
      const useHeaderName = KafkaHeadersHelper.nameAsHeaderName(key);
      if (useHeaderName === undefined) {
        continue;
      }

      let value: string | undefined;

      const asyncContextValue = params.asyncContext?.[key];
      if (asyncContextValue !== undefined) {
        value = asyncContextValue.toString();
      } else if (useHeaderName in headers && headers[useHeaderName] !== undefined) {
        const headerValue = headers[useHeaderName];

        if (Array.isArray(headerValue)) {
          value = headerValue.join('-');
          value = TraceSpanHelper.formatToGuid(value);
        } else {
          value = headerValue;
        }
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

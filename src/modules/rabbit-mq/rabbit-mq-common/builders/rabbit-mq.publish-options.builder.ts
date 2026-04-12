import { TraceSpanHelper } from 'src/modules/elk-logger';
import {
  IRabbitMqHeaders,
  IRabbitMqPublishOptions,
  IRabbitMqPublishOptionsBuilder,
  IRabbitMqPublishOptionsBuilderOptions,
} from '../types/types';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';
import { RabbitMqMessageHelper } from '../helpers/rabbit-mq.message.helper';

export class RabbitMqPublishOptionsBuilder implements IRabbitMqPublishOptionsBuilder {
  build(
    params: { asyncContext: IRabbitMqAsyncContext; publishOptions?: IRabbitMqPublishOptions },
    options?: IRabbitMqPublishOptionsBuilderOptions,
  ): IRabbitMqPublishOptions {
    const useZipkin: boolean = options?.useZipkin ?? false;

    const headers = { ...params.publishOptions?.headers };

    const tgt: IRabbitMqHeaders = {};

    const asyncContextKeys = ['traceId', 'spanId', 'requestId'] as const;

    for (const key of asyncContextKeys) {
      const useHeaderName = RabbitMqMessageHelper.nameAsHeaderName(key, useZipkin);
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
        value = Array.isArray(headerValue) ? headerValue.join('-') : (headerValue as unknown as string);

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

      [RabbitMqMessageHelper.nameAsHeaderName(key, false), RabbitMqMessageHelper.nameAsHeaderName(key, true)].forEach(
        (headerName) => {
          if (headerName !== undefined && headerName in headers) {
            delete headers[headerName];
          }
        },
      );
    }

    return {
      ...params.publishOptions,
      headers: {
        ...headers,
        ...tgt,
      },
      correlationId: params.asyncContext?.correlationId ?? params.publishOptions?.correlationId,
      replyTo: params.asyncContext?.replyTo ?? params.publishOptions?.replyTo,
      messageId: params.asyncContext?.messageId ?? params.publishOptions?.messageId,
    };
  }
}

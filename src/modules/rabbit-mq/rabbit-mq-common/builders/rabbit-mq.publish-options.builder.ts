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
    _options?: IRabbitMqPublishOptionsBuilderOptions,
  ): IRabbitMqPublishOptions {
    const headers = { ...params.publishOptions?.headers };

    const tgt: IRabbitMqHeaders = {};

    const asyncContextKeys = ['traceId', 'spanId', 'requestId'] as const;

    for (const key of asyncContextKeys) {
      const useHeaderName = RabbitMqMessageHelper.nameAsHeaderName(key);
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
        } else {
          value = headerValue as unknown as string;
        }
      }

      if (value !== undefined && value !== '') {
        tgt[useHeaderName] = value;
      }
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

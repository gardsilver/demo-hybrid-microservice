import { Factory } from 'fishery';
import { MessageProperties } from 'amqplib';
import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext } from 'src/modules/common';
import { httpHeadersFactory, IBaseHeaders } from 'tests/modules/http/http-common';
import {
  messagePropertyHeadersFactory,
  MessagePropertyHeadersFactoryOptions,
} from './message-property-headers.factory';

export interface MessagePropertiesFactoryOptions {
  properties?: Partial<MessageProperties>;
  baseHeaders?: IBaseHeaders;
  headersOptions?: Partial<IGeneralAsyncContext & { useZipkin?: boolean; asArray?: boolean }>;
  propertyHeadersOptions?: Partial<MessagePropertyHeadersFactoryOptions>;
}

export const messagePropertiesFactory = Factory.define<MessageProperties, MessagePropertiesFactoryOptions>(
  ({ transientParams }) => {
    const tgt: MessageProperties = {
      contentType:
        transientParams?.properties && 'contentType' in transientParams.properties
          ? (transientParams.properties.contentType ?? faker.string.alpha(5))
          : undefined,
      contentEncoding:
        transientParams?.properties && 'contentEncoding' in transientParams.properties
          ? (transientParams.properties.contentEncoding ?? faker.string.alpha(5))
          : undefined,
      headers:
        transientParams?.properties && 'headers' in transientParams.properties
          ? (transientParams.properties.headers ??
            messagePropertyHeadersFactory.build(
              {
                ...httpHeadersFactory.build(
                  {
                    ...transientParams.baseHeaders,
                  },
                  {
                    transient: {
                      traceId: undefined,
                      spanId: undefined,
                      requestId: undefined,
                      ...transientParams?.headersOptions,
                    },
                  },
                ),
              },
              {
                transient: {
                  firstDeathExchange: true,
                  firstDeathQueue: true,
                  firstDeathReason: true,
                  death: true,
                  ...transientParams?.propertyHeadersOptions,
                },
              },
            ))
          : undefined,
      deliveryMode:
        transientParams?.properties && 'deliveryMode' in transientParams.properties
          ? (transientParams.properties.deliveryMode ?? faker.number.int({ min: 1, max: 2 }))
          : undefined,
      priority:
        transientParams?.properties && 'priority' in transientParams.properties
          ? (transientParams.properties.priority ?? faker.number.int(100))
          : undefined,
      correlationId:
        transientParams?.properties && 'correlationId' in transientParams.properties
          ? (transientParams.properties.correlationId ?? faker.string.uuid())
          : undefined,
      replyTo:
        transientParams?.properties && 'replyTo' in transientParams.properties
          ? (transientParams.properties?.replyTo ?? faker.string.alpha(5))
          : undefined,
      expiration:
        transientParams?.properties && 'expiration' in transientParams.properties
          ? (transientParams.properties?.expiration ?? faker.string.alpha(5))
          : undefined,
      messageId:
        transientParams?.properties && 'messageId' in transientParams.properties
          ? (transientParams.properties?.messageId ?? faker.string.uuid())
          : undefined,
      timestamp:
        transientParams?.properties && 'timestamp' in transientParams.properties
          ? (transientParams.properties?.timestamp ?? faker.number.int())
          : undefined,
      type:
        transientParams?.properties && 'type' in transientParams.properties
          ? (transientParams.properties?.type ?? faker.string.alpha(5))
          : undefined,
      userId:
        transientParams?.properties && 'userId' in transientParams.properties
          ? (transientParams.properties?.userId ?? faker.string.uuid())
          : undefined,
      appId:
        transientParams?.properties && 'appId' in transientParams.properties
          ? (transientParams.properties?.appId ?? faker.string.uuid())
          : undefined,
      clusterId:
        transientParams?.properties && 'clusterId' in transientParams.properties
          ? (transientParams.properties?.clusterId ?? faker.string.uuid())
          : undefined,
    };

    return tgt;
  },
);

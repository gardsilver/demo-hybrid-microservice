import { RmqOptions } from '@nestjs/microservices';
import {
  AmqpConnectionManagerSocketOptions,
  AmqplibQueueOptions,
  RmqUrl,
} from '@nestjs/microservices/external/rmq-url.interface';
import { MessageProperties, ConsumeMessage, Options } from 'amqplib';
import { IHeadersToContextAdapter } from 'src/modules/common';
import { IRabbitMqAsyncContext } from './rabbit-mq.async-context.type';

export interface RMQErrorInfo {
  err?: Error;
  url?: string | Options.Connect;
}

export interface IRabbitMqUrl {
  protocol: string;
  hostname: string;
  port: number;
  vhost: string;
}
export type RabbitMqHeadersValue =
  | string
  | number
  | boolean
  | { [key: string]: RabbitMqHeadersValue }
  | Array<RabbitMqHeadersValue>;

export interface IRabbitMqHeaders {
  [key: string]: RabbitMqHeadersValue;
}
export interface IRabbitMqMessageProperties extends Omit<MessageProperties, 'headers'> {
  headers: IRabbitMqHeaders;
}

export interface IRabbitMqConnectionOptions {
  urls?: string[] | RmqUrl[];
  socketOptions?: AmqpConnectionManagerSocketOptions;
  maxConnectionAttempts?: number;
}

export interface IRabbitMqChannelOptions {
  noAssert?: boolean;
  queue?: string;
  queueOptions?: AmqplibQueueOptions;
  replyQueue: string;
  exchange?: string;
  exchangeType?: NonNullable<RmqOptions['options']>['exchangeType'];
  exchangeArguments?: NonNullable<RmqOptions['options']>['exchangeArguments'];
  routing?: string | string[];
}

export interface IRabbitMqPublishOptions extends Omit<Options.Publish, 'headers'> {
  headers?: IRabbitMqHeaders;
}

export interface IRabbitMqConsumerOptions {
  noAck?: boolean;
  consumerTag?: string;
  prefetchCount?: number;
  isGlobalPrefetchCount?: boolean;
}

export declare const enum RmqStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  CRASHED = 'crashed',
}

export interface IRabbitMqMessagePropertiesToAsyncContextAdapter extends IHeadersToContextAdapter<
  IRabbitMqAsyncContext,
  IRabbitMqMessageProperties
> {}

export interface IRabbitMqPublishOptionsBuilderOptions {
  useZipkin?: boolean;
  asArray?: boolean;
}

export interface IRabbitMqPublishOptionsBuilder {
  build(
    params: { asyncContext: IRabbitMqAsyncContext; publishOptions?: IRabbitMqPublishOptions },
    options?: IRabbitMqPublishOptionsBuilderOptions,
  ): IRabbitMqPublishOptions;
}

export interface IRabbitMqConsumeMessage<T = unknown> extends Omit<ConsumeMessage, 'content' | 'properties'> {
  content?: T;
  properties: IRabbitMqMessageProperties;
}

export interface IRabbitMqProducerMessage<T = unknown> {
  queue?: string;
  exchange?: string;
  routingKey?: string;
  content?: T;
  publishOptions?: IRabbitMqPublishOptions;
}

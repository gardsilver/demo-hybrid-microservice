import { KafkaOptions } from '@nestjs/microservices';
import { IHeaders, IHeadersToContextAdapter } from 'src/modules/common';
import { IKafkaAsyncContext } from './kafka.async-context.type';
import { IKafkaLogFilterParams } from '../builders/kafka.ekf-logger.builder';

export interface IKafkaHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IKafkaAsyncContext> {}

export interface IKafkaHeadersBuilder {
  build(
    params: { asyncContext: IKafkaAsyncContext; headers?: IHeaders },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): IHeaders;
}

type KafkaOptionsResolved = NonNullable<KafkaOptions['options']>;
export type KafkaClientConfig = NonNullable<KafkaOptionsResolved['client']>;
export type KafkaRetryConfig = NonNullable<KafkaClientConfig['retry']>;
export type KafkaConsumerConfig = NonNullable<KafkaOptionsResolved['consumer']>;
export type KafkaProducerConfig = NonNullable<KafkaOptionsResolved['producer']>;

export interface IKafkaClientOptions extends Omit<KafkaClientConfig, 'logLevel' | 'logCreator' | 'retry' | 'brokers'> {
  brokers: string[];
  normalizeUrl?: boolean;
  useLogger?: boolean;
  logFilterParams?: IKafkaLogFilterParams[];
  retry?: Omit<KafkaRetryConfig, 'restartOnFailure'>;
}

export interface IKafkaConsumerOptions extends Omit<KafkaConsumerConfig, 'retry'> {
  retry?: KafkaRetryConfig;
}

export interface IKafkaProducerOptions extends Omit<KafkaProducerConfig, 'retry'> {
  retry?: Omit<KafkaRetryConfig, 'restartOnFailure'>;
}

export interface IKafkaHealthIndicatorOptions {
  useAdmin?: boolean;
  retry?: Omit<KafkaRetryConfig, 'restartOnFailure'>;
}

export interface IKafkaClientProxyBuilderOptions extends Omit<
  KafkaOptionsResolved,
  'client' | 'consumer' | 'producer' | 'parser'
> {
  serverName: string;
  client: IKafkaClientOptions;
  consumer?: IKafkaConsumerOptions;
  producer?: IKafkaProducerOptions;
}

export interface IKafkaMessage<T> {
  key?: string | null;
  value: T;
  headers?: IHeaders;
}

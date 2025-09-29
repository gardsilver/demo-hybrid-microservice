import { KafkaOptions } from '@nestjs/microservices';
import { IHeaders, IHeadersToContextAdapter } from 'src/modules/common';
import { IKafkaAsyncContext } from './kafka.async-context.type';

export interface IKafkaHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IKafkaAsyncContext> {}

export interface IKafkaHeadersBuilder {
  build(
    params: { asyncContext: IKafkaAsyncContext; headers?: IHeaders },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): IHeaders;
}

export type KafkaClientConfig = KafkaOptions['options']['client'];
export type KafkaRetryConfig = KafkaOptions['options']['client']['retry'];
export type KafkaConsumerConfig = KafkaOptions['options']['consumer'];
export type KafkaProducerConfig = KafkaOptions['options']['producer'];

export interface IRetryOptions {
  retry?: boolean;
  timeout?: number;
  delay?: number;
  retryMaxCount?: number;
  statusCodes?: Array<string | number>;
}

export interface IKafkaClientOptions extends Omit<KafkaClientConfig, 'logLevel' | 'logCreator' | 'retry' | 'brokers'> {
  brokers: string[];
  normalizeUrl?: boolean;
  useLogger?: boolean;
  retry?: Omit<IRetryOptions, 'statusCodes'>;
}

export interface IKafkaConsumerOptions extends Omit<KafkaConsumerConfig, 'retry'> {
  retry?: IRetryOptions;
}

export interface IKafkaProducerOptions extends Omit<KafkaProducerConfig, 'retry'> {
  retry?: Omit<IRetryOptions, 'statusCodes'>;
}

export interface IKafkaClientProxyBuilderOptions
  extends Omit<KafkaOptions['options'], 'client' | 'consumer' | 'producer' | 'parser'> {
  serverName: string;
  client: IKafkaClientOptions;
  consumer?: IKafkaConsumerOptions;
  producer?: IKafkaProducerOptions;
}

export interface IKafkaMessage<T> {
  key?: string;
  value: T;
  headers: IHeaders;
}

import { Provider } from '@nestjs/common';
import { Serializer } from '@nestjs/microservices';
import { Message, ProducerRecord } from '@nestjs/microservices/external/kafka.interface';
import {
  IHeaders,
  ImportsType,
  ServiceClassProvider,
  ServiceFactoryProvider,
  ServiceValueProvider,
} from 'src/modules/common';
import {
  IKafkaAsyncContext,
  IKafkaClientProxyBuilderOptions,
  IKafkaHeadersBuilder,
  IKafkaMessage,
  IKafkaProducerOptions,
} from 'src/modules/kafka/kafka-common';

export interface IKafkaHeadersBuilderOptions {
  useZipkin?: boolean;
  asArray?: boolean;
}
export interface IKafkaHeadersRequestBuilder extends IKafkaHeadersBuilder {
  build(
    params: { asyncContext: IKafkaAsyncContext; headers?: IHeaders },
    options?: IKafkaHeadersBuilderOptions,
  ): IHeaders;
}

export enum ProducerMode {
  SEND = 'send',
  SEND_BATCH = 'sendBatch',
}

export interface IKafkaRequest<T = unknown> {
  topic: string;
  data: IKafkaMessage<T> | IKafkaMessage<T>[];
}

export type IProducerSerializerOptions = Record<string, unknown> & {
  serverName: string;
  mode: ProducerMode;
};

export interface IKafkaSendOptions
  extends Omit<ProducerRecord, 'topic' | 'messages'>, Omit<Message, 'key' | 'value' | 'headers'> {
  serializer?: IProducerSerializer;
  serializerOption?: Record<string, unknown>;
  headerBuilder?: IKafkaHeadersRequestBuilder;
  headersBuilderOptions?: IKafkaHeadersBuilderOptions & { skip?: boolean };
}

export interface IKafkaRequestOptions extends IKafkaSendOptions {}

export interface IProducerPacket<T = unknown> {
  topic: string;
  data: IKafkaMessage<T>;
}

export interface IProducerSerializer<T = unknown> extends Serializer<
  IProducerPacket<T>,
  IKafkaMessage<string | Buffer>
> {
  serialize(value: IProducerPacket<T>, options: IProducerSerializerOptions): IKafkaMessage<string | Buffer>;
}

export interface IKafkaClientServiceOptions extends Omit<
  IKafkaClientProxyBuilderOptions,
  'producerOnlyMode' | 'consumer' | 'run' | 'subscribe' | 'producer' | 'serializer' | 'deserializer'
> {
  producer?: IKafkaProducerOptions;
  logTitle?: string;
}

export interface IKafkaClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  kafkaClientProxyBuilderOptions:
    | ServiceClassProvider<IKafkaClientServiceOptions>
    | ServiceValueProvider<IKafkaClientServiceOptions>
    | ServiceFactoryProvider<IKafkaClientServiceOptions>;
  serializer?:
    | ServiceClassProvider<IProducerSerializer>
    | ServiceValueProvider<IProducerSerializer>
    | ServiceFactoryProvider<IProducerSerializer>;
  headerBuilder?:
    | ServiceClassProvider<IKafkaHeadersRequestBuilder>
    | ServiceValueProvider<IKafkaHeadersRequestBuilder>
    | ServiceFactoryProvider<IKafkaHeadersRequestBuilder>;
  requestOptions?:
    | ServiceClassProvider<Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>>
    | ServiceValueProvider<Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>>
    | ServiceFactoryProvider<Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>>;
}

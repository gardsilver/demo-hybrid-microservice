import { Provider } from '@nestjs/common';
import { Deserializer, ReadPacket } from '@nestjs/microservices';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { ImportsType, IServiceClassProvider, IServiceFactoryProvider, IServiceValueProvider } from 'src/modules/common';
import { IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import {
  IKafkaClientProxyBuilderOptions,
  IKafkaHeadersToAsyncContextAdapter,
  IKafkaHealthIndicatorOptions,
  IKafkaMessage,
} from 'src/modules/kafka/kafka-common';
import { KafkaServerStatusService } from '../services/kafka-server.status.service';

export enum ConsumerMode {
  EACH_MESSAGE = 'eachMessage',
  EACH_BATCH = 'eachBatch',
}

export interface IConsumerPacket<T = unknown> extends ReadPacket<IKafkaMessage<T> | undefined> {}

export type IKafkaMessageOptions = Record<string, unknown> & {
  serverName: string;
  mode: ConsumerMode;
  topic: string;
  correlationId?: string;
  replyTopic?: string;
  replyPartition?: number;
};

export interface IConsumerDeserializer<T = unknown> extends Deserializer<KafkaMessage, IConsumerPacket<T>> {
  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): IConsumerPacket<T> | Promise<IConsumerPacket<T>>;
}

export interface IEventKafkaMessageOptions<T = unknown> extends Partial<
  Omit<IKafkaMessageOptions, 'topic' | 'correlationId'>
> {
  serverName: string;
  headerAdapter?: IKafkaHeadersToAsyncContextAdapter;
  deserializer?: IConsumerDeserializer<T>;
}

export interface IKafkaServerOptions<T = unknown> extends Omit<
  IKafkaClientProxyBuilderOptions,
  'producerOnlyMode' | 'producer' | 'serializer' | 'deserializer'
> {
  deserializer?: IConsumerDeserializer<T>;
  headerAdapter?: IKafkaHeadersToAsyncContextAdapter;
  healthIndicatorOptions?: IKafkaHealthIndicatorOptions;
}

export interface IKafkaMicroserviceBuilderOptions<T = unknown> {
  kafkaOptions: IKafkaServerOptions<T> & { startTimeout?: number };
  loggerBuilder: IElkLoggerServiceBuilder;
  prometheusManager: PrometheusManager;
  kafkaStatusService: KafkaServerStatusService;
}

export interface IKafkaServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersToAsyncContextAdapter?:
    | IServiceClassProvider<IKafkaHeadersToAsyncContextAdapter>
    | IServiceValueProvider<IKafkaHeadersToAsyncContextAdapter>
    | IServiceFactoryProvider<IKafkaHeadersToAsyncContextAdapter>;
}

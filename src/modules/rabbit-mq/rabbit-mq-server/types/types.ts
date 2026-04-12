import { ConsumeMessage } from 'amqplib';
import { Provider } from '@nestjs/common';
import { Deserializer, ReadPacket } from '@nestjs/microservices';
import { ImportsType, IServiceClassProvider, IServiceFactoryProvider, IServiceValueProvider } from 'src/modules/common';
import {
  IRabbitMqMessagePropertiesToAsyncContextAdapter,
  IRabbitMqConsumeMessage,
  IRabbitMqConnectionOptions,
  IRabbitMqChannelOptions,
  IRabbitMqConsumerOptions,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import { PrometheusManager } from 'src/modules/prometheus';
import { RabbitMqServerStatusService } from '../services/rabbit-mq-server.status.service';

export interface IConsumerInfo {
  queue: string;
  exchange?: string;
  routing?: string[];
}

export interface IRabbitMqMicroserviceBuilderOptions<T = unknown> {
  serverName: string;
  consumer: Partial<IRabbitMqConnectionOptions & IRabbitMqChannelOptions & IRabbitMqConsumerOptions> & {
    deserializer?: IConsumerDeserializer<T>;
  };
  prometheusManager: PrometheusManager;
  rabbitMqStatusService: RabbitMqServerStatusService;
}

export interface IRabbitMqEventOptions {
  [key: string]: unknown;
  serverName: string;
  consumer?: Partial<IRabbitMqChannelOptions & IRabbitMqConsumerOptions>;
}

export interface IConsumerPacket<T = unknown> extends ReadPacket<IRabbitMqConsumeMessage<T> | undefined> {}

export interface IConsumerDeserializer<T = unknown> extends Deserializer<ConsumeMessage, IConsumerPacket<T>> {
  deserialize(
    value: ConsumeMessage,
    options: IRabbitMqEventOptions & { pattern: string },
  ): IConsumerPacket<T> | Promise<IConsumerPacket<T>>;
}

export interface IRabbitMqServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  messagePropertiesAdapter?:
    | IServiceClassProvider<IRabbitMqMessagePropertiesToAsyncContextAdapter>
    | IServiceValueProvider<IRabbitMqMessagePropertiesToAsyncContextAdapter>
    | IServiceFactoryProvider<IRabbitMqMessagePropertiesToAsyncContextAdapter>;
}

export interface IEventRabbitMqMessageOptions<T = unknown> extends IRabbitMqEventOptions {
  deserializer?: IConsumerDeserializer<T>;
}

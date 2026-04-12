import { Provider } from '@nestjs/common';
import { Serializer } from '@nestjs/microservices';
import { ImportsType, ServiceClassProvider, ServiceFactoryProvider, ServiceValueProvider } from 'src/modules/common';
import {
  IRabbitMqChannelOptions,
  IRabbitMqConnectionOptions,
  IRabbitMqPublishOptions,
  IRabbitMqProducerMessage,
  IRabbitMqPublishOptionsBuilder,
  IRabbitMqPublishOptionsBuilderOptions,
} from 'src/modules/rabbit-mq/rabbit-mq-common';

export type IProducerSerializerOptions = Record<string, unknown> & {
  serverName: string;
  pattern?: string;
};

export interface IProducerSerializer<T = unknown> extends Serializer<
  IRabbitMqProducerMessage<T>,
  IRabbitMqProducerMessage<Buffer | string | null>
> {
  serialize(
    value: IRabbitMqProducerMessage<T>,
    options: IProducerSerializerOptions,
  ): IRabbitMqProducerMessage<Buffer | string | null>;
}

export interface IRabbitMqClientOptions<T = unknown> {
  serverName: string;
  producer: Partial<IRabbitMqConnectionOptions & IRabbitMqChannelOptions> & {
    serializer?: IProducerSerializer<T>;
    serializerOption?: Omit<IProducerSerializerOptions, 'serverName' | 'pattern'>;
    publishOptionsBuilder?: IRabbitMqPublishOptionsBuilder;
    publishOptionsBuilderOptions?: IRabbitMqPublishOptionsBuilderOptions & { skip?: boolean };
    publishOptions?: IRabbitMqPublishOptions;
  };
}

export interface IRabbitMqSendOptions<T = unknown> {
  serializer?: IProducerSerializer<T>;
  serializerOption?: Omit<IProducerSerializerOptions, 'serverName'>;
  publishOptionsBuilder?: IRabbitMqPublishOptionsBuilder;
  publishOptionsBuilderOptions?: IRabbitMqPublishOptionsBuilderOptions & { skip?: boolean };
}

export interface IRabbitMqClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  clientProxyBuilderOptions:
    | ServiceClassProvider<Omit<IRabbitMqClientOptions, 'serializer' | 'publishOptionsBuilder'>>
    | ServiceValueProvider<Omit<IRabbitMqClientOptions, 'serializer' | 'publishOptionsBuilder'>>
    | ServiceFactoryProvider<Omit<IRabbitMqClientOptions, 'serializer' | 'publishOptionsBuilder'>>;
  serializer?:
    | ServiceClassProvider<IProducerSerializer>
    | ServiceValueProvider<IProducerSerializer>
    | ServiceFactoryProvider<IProducerSerializer>;
  publishOptionsBuilder?:
    | ServiceClassProvider<IRabbitMqPublishOptionsBuilder>
    | ServiceValueProvider<IRabbitMqPublishOptionsBuilder>
    | ServiceFactoryProvider<IRabbitMqPublishOptionsBuilder>;
}

import { Channel } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { BaseRpcContext } from '@nestjs/microservices';
import { IRabbitMqConsumeMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IRabbitMqEventOptions } from '../types/types';

type RabbitMqContextArgs<T = unknown> = [
  messageRef: ConsumeMessage,
  message: IRabbitMqConsumeMessage<T>,
  channel: Channel,
  messageOptions: IRabbitMqEventOptions & { pattern: string },
];

export class RabbitMqContext<T = unknown> extends BaseRpcContext<RabbitMqContextArgs<T>> {
  constructor(args: RabbitMqContextArgs<T>) {
    super(args);
  }

  getMessageRef() {
    return this.args[0];
  }

  getMessage() {
    return this.args[1];
  }

  getChannelRef() {
    return this.args[2];
  }

  getMessageOptions() {
    return this.args[3];
  }
}

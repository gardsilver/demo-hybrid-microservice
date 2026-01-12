/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Message, ConsumeMessage, Options, Replies } from 'amqplib';
import { faker } from '@faker-js/faker';

export class MockChannel {
  queue: string;
  messageCount: number;
  consumerCount: number;
  testOnMessage: (msg: ConsumeMessage | null) => void;

  constructor() {}

  async assertQueue(queue: string, options?: Options.AssertQueue): Promise<Replies.AssertQueue> {
    this.queue = queue === '' ? faker.string.alpha(10) : queue;
    this.messageCount = faker.number.int();
    this.consumerCount = faker.number.int();

    return {
      queue: this.queue,
      messageCount: this.messageCount,
      consumerCount: this.consumerCount,
    };
  }

  ack(message: Message, allUpTo?: boolean): void {}

  nack(message: Message, allUpTo?: boolean, requeue?: boolean): void {}

  async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string,
    options?: Options.AssertExchange,
  ): Promise<Replies.AssertExchange> {
    return {
      exchange,
    };
  }

  async bindQueue(queue: string, source: string, pattern: string, args?: any): Promise<Replies.Empty> {
    return {};
  }

  async prefetch(count: number, global?: boolean): Promise<Replies.Empty> {
    return {};
  }
  async publish(exchange: string, routingKey: string, content: Buffer, options?: Options.Publish): Promise<boolean> {
    return true;
  }
  async sendToQueue(queue: string, content: Buffer, options?: Options.Publish): Promise<boolean> {
    return true;
  }

  async consume(
    queue: string,
    onMessage: (msg: ConsumeMessage | null) => void,
    options?: Options.Consume,
  ): Promise<Replies.Consume> {
    this.testOnMessage = onMessage;

    return {
      consumerTag: options.consumerTag ?? '',
    };
  }
}

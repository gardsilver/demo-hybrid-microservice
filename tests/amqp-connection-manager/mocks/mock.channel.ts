/* eslint-disable @typescript-eslint/no-explicit-any */
import { Message, ConsumeMessage, Options, Replies } from 'amqplib';
import { faker } from '@faker-js/faker';

export class MockChannel {
  queue = '';
  messageCount = 0;
  consumerCount = 0;
  testOnMessage: ((msg: ConsumeMessage | null) => void) | undefined;

  constructor() {}

  async assertQueue(queue: string, _options?: Options.AssertQueue): Promise<Replies.AssertQueue> {
    this.queue = queue === '' ? faker.string.alpha(10) : queue;
    this.messageCount = faker.number.int();
    this.consumerCount = faker.number.int();

    return {
      queue: this.queue,
      messageCount: this.messageCount,
      consumerCount: this.consumerCount,
    };
  }

  ack(_message: Message, _allUpTo?: boolean): void {}

  nack(_message: Message, _allUpTo?: boolean, _requeue?: boolean): void {}

  async assertExchange(
    exchange: string,
    _type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string,
    _options?: Options.AssertExchange,
  ): Promise<Replies.AssertExchange> {
    return {
      exchange,
    };
  }

  async bindQueue(_queue: string, _source: string, _pattern: string, _args?: any): Promise<Replies.Empty> {
    return {};
  }

  async prefetch(_count: number, _global?: boolean): Promise<Replies.Empty> {
    return {};
  }
  async publish(
    _exchange: string,
    _routingKey: string,
    _content: Buffer,
    _options?: Options.Publish,
  ): Promise<boolean> {
    return true;
  }
  async sendToQueue(_queue: string, _content: Buffer, _options?: Options.Publish): Promise<boolean> {
    return true;
  }

  async consume(
    _queue: string,
    onMessage: (msg: ConsumeMessage | null) => void,
    options?: Options.Consume,
  ): Promise<Replies.Consume> {
    this.testOnMessage = onMessage;

    return {
      consumerTag: options?.consumerTag ?? '',
    };
  }
}

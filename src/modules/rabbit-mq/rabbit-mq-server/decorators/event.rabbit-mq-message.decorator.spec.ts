/* eslint-disable @typescript-eslint/unbound-method */
import { Transport } from '@nestjs/microservices';
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '@nestjs/microservices/constants';
import { PatternHandler } from '@nestjs/microservices/enums/pattern-handler.enum';
import { MockConsumerDeserializer } from 'tests/modules/rabbit-mq';
import { EventRabbitMqMessage } from './event.rabbit-mq-message.decorator';

const params = {
  serverName: 'serverName',
  consumer: {
    noAck: false,
    exchange: 'logs',
    exchangeType: 'direct',
    routing: 'info',
    queueOptions: {
      durable: true,
      autoDelete: true,
    },
  },
  deserializer: new MockConsumerDeserializer(),
};

class Test {
  @EventRabbitMqMessage(['Logs'], params)
  public static eachMessage() {}

  @EventRabbitMqMessage(['Logs'], () => params)
  public static handleMessage() {}
}

describe(EventRabbitMqMessage.name, () => {
  it('EventRabbitMqMessage for object', async () => {
    expect(Reflect.getMetadata(PATTERN_METADATA, Test.eachMessage)).toEqual(['Logs']);

    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, Test.eachMessage)).toBe(PatternHandler.EVENT);

    expect(Reflect.getMetadata(TRANSPORT_METADATA, Test.eachMessage)).toBe(Transport.RMQ);

    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, Test.eachMessage)).toEqual(params);
  });

  it('EventRabbitMqMessage for function', async () => {
    expect(Reflect.getMetadata(PATTERN_METADATA, Test.handleMessage)).toEqual(['Logs']);

    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, Test.handleMessage)).toBe(PatternHandler.EVENT);

    expect(Reflect.getMetadata(TRANSPORT_METADATA, Test.handleMessage)).toBe(Transport.RMQ);

    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, Test.handleMessage)).toEqual(params);
  });
});

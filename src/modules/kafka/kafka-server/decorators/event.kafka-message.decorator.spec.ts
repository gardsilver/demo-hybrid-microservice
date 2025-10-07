/* eslint-disable @typescript-eslint/unbound-method */
import { Transport } from '@nestjs/microservices';
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '@nestjs/microservices/constants';
import { PatternHandler } from '@nestjs/microservices/enums/pattern-handler.enum';
import { KafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';
import { MockConsumerDeserializer } from 'tests/modules/kafka';
import { ConsumerMode } from '../types/types';
import { EventKafkaMessage } from './event.kafka-message.decorator';

const params = {
  serverName: 'serverName',
  mode: ConsumerMode.EACH_BATCH,
  replyTopic: 'replyTopic',
  replyPartition: 3,
  headerAdapter: new KafkaHeadersToAsyncContextAdapter(),
  deserializer: new MockConsumerDeserializer(),
};

class Test {
  @EventKafkaMessage(['topic'], params)
  public static eachBatch() {}

  @EventKafkaMessage(['topic'], { ...params, mode: undefined })
  public static eachMessage() {}
}

describe(EventKafkaMessage.name, () => {
  it('EventKafkaMessage', async () => {
    expect(Reflect.getMetadata(PATTERN_METADATA, Test.eachBatch)).toEqual(['topic']);

    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, Test.eachBatch)).toBe(PatternHandler.EVENT);

    expect(Reflect.getMetadata(TRANSPORT_METADATA, Test.eachBatch)).toBe(Transport.KAFKA);

    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, Test.eachBatch)).toEqual(params);

    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, Test.eachMessage)).toEqual({
      ...params,
      mode: ConsumerMode.EACH_MESSAGE,
    });
  });
});

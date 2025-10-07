import { faker } from '@faker-js/faker';
import { CompressionTypes } from '@nestjs/microservices/external/kafka.interface';
import { IKafkaRequestOptions } from '../types/types';
import { KafkaClientHelper } from './kafka-client.helper';

describe(KafkaClientHelper.name, () => {
  let options: IKafkaRequestOptions;
  beforeEach(async () => {
    options = {
      partition: faker.number.int(),
      timestamp: faker.number.int().toString(),
      acks: faker.number.int(),
      timeout: faker.number.int(),
      compression: CompressionTypes.GZIP,
    };
  });

  it('buildMessageParams', async () => {
    expect(KafkaClientHelper.buildMessageParams(options)).toEqual({
      partition: options.partition,
      timestamp: options.timestamp,
    });
  });

  it('buildProducerParams', async () => {
    expect(KafkaClientHelper.buildProducerParams(options)).toEqual({
      acks: options?.acks,
      timeout: options?.timeout,
      compression: options?.compression,
    });
  });
});

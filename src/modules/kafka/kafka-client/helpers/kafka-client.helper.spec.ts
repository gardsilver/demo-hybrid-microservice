import { faker } from '@faker-js/faker';
import { CompressionTypes } from '@nestjs/microservices/external/kafka.interface';
import { IKafkaRequestOptions, IKafkaSendOptions } from '../types/types';
import { KafkaClientHelper } from './kafka-client.helper';

describe(KafkaClientHelper.name, () => {
  let options: IKafkaSendOptions;
  beforeEach(async () => {
    options = {
      partition: faker.number.int(),
      timestamp: faker.number.int().toString(),
      acks: faker.number.int(),
      timeout: faker.number.int(),
      compression: CompressionTypes.GZIP,
    };
  });

  it('mergeRequestOptions', async () => {
    const globalOptions: Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'> = {
      timeout: faker.number.int(),
      partition: faker.number.int(),
      serializerOption: {
        message: faker.string.alpha(4),
        details: faker.string.alpha(4),
      },
      headersBuilderOptions: {
        useZipkin: true,
        asArray: false,
      },
    };

    const options: Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'> = {
      timeout: faker.number.int(),
      acks: faker.number.int(),
      serializerOption: {
        status: faker.string.alpha(4),
      },
      headersBuilderOptions: {
        asArray: true,
        skip: false,
      },
    };

    expect(KafkaClientHelper.mergeRequestOptions(globalOptions)).toEqual(globalOptions);
    expect(KafkaClientHelper.mergeRequestOptions(globalOptions, options)).toEqual({
      partition: globalOptions.partition,
      timeout: options.timeout,
      acks: options.acks,
      serializerOption: {
        message: globalOptions.serializerOption['message'],
        details: globalOptions.serializerOption['details'],
        status: options.serializerOption['status'],
      },
      headersBuilderOptions: {
        useZipkin: globalOptions.headersBuilderOptions.useZipkin,
        asArray: options.headersBuilderOptions.asArray,
        skip: options.headersBuilderOptions.skip,
      },
    });
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

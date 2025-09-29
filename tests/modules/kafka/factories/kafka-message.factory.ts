import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { KafkaMessage } from 'kafkajs';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { IKafkaAsyncContext, KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { kafkaHeadersFactory } from './kafka.headers.factory';

const createBuffer = (value?: Buffer | null, params?: string): Buffer | null => {
  if (value === null) {
    return null;
  }

  const template = value ?? params ?? faker.string.alpha(10);

  return Buffer.isBuffer(template) ? template : Buffer.from(template, 'utf-8');
};

export const kafkaMessageFactory = Factory.define<
  KafkaMessage,
  {
    key?: string;
    value?: string;
    headers?: IKafkaAsyncContext & {
      useZipkin?: boolean;
      asArray?: boolean;
      asBatch?: boolean;
    };
  }
>(({ params, transientParams }) => {
  return {
    key: createBuffer(params?.key as undefined as Buffer | null, transientParams?.key),
    value: createBuffer(params?.value as undefined as Buffer | null, transientParams?.value),
    timestamp: new DateTimestamp().getTimestamp().toString(),
    attributes: 0,
    offset: faker.number.int(4).toString(),
    headers: kafkaHeadersFactory.build(params?.headers ? KafkaHeadersHelper.normalize(params?.headers) : {}, {
      transient: transientParams?.headers,
    }),
  };
});

import { faker } from '@faker-js/faker';
import { KafkaConsumerOptionsBuilder } from './kafka.consumer-options.builder';

describe(KafkaConsumerOptionsBuilder.name, () => {
  it('build', async () => {
    const retry = {
      maxRetryTime: faker.number.int(),
      initialRetryTime: faker.number.int(),
      retries: faker.number.int(),
    };

    expect(
      KafkaConsumerOptionsBuilder.build({
        groupId: 'groupId',
        allowAutoTopicCreation: true,
        retry: {
          ...retry,
        },
      }),
    ).toEqual({
      groupId: 'groupId',
      allowAutoTopicCreation: true,
      retry,
    });
  });
});

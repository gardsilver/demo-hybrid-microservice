import { faker } from '@faker-js/faker';
import { KafkaConsumerOptionsBuilder } from './kafka.consumer-options.builder';

describe(KafkaConsumerOptionsBuilder.name, () => {
  it('build', async () => {
    expect(
      KafkaConsumerOptionsBuilder.build({
        groupId: 'groupId',
        allowAutoTopicCreation: true,
        retry: {
          timeout: faker.number.int(),
          delay: faker.number.int(),
          retryMaxCount: faker.number.int(),
        },
      }),
    ).toEqual({
      groupId: 'groupId',
      allowAutoTopicCreation: true,
    });
  });
});

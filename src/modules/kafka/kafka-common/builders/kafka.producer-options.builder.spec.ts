import { faker } from '@faker-js/faker';
import { KafkaProducerOptionsBuilder } from './kafka.producer-options.builder';

describe(KafkaProducerOptionsBuilder.name, () => {
  it('build', async () => {
    expect(
      KafkaProducerOptionsBuilder.build({
        allowAutoTopicCreation: true,
        retry: {
          timeout: faker.number.int(),
          delay: faker.number.int(),
          retryMaxCount: faker.number.int(),
        },
      }),
    ).toEqual({
      allowAutoTopicCreation: true,
    });
  });
});

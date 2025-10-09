import { faker } from '@faker-js/faker';
import { KafkaProducerOptionsBuilder } from './kafka.producer-options.builder';

describe(KafkaProducerOptionsBuilder.name, () => {
  it('build', async () => {
    const retry = {
      maxRetryTime: faker.number.int(),
      initialRetryTime: faker.number.int(),
      retries: faker.number.int(),
    };

    expect(
      KafkaProducerOptionsBuilder.build({
        allowAutoTopicCreation: true,
        retry: {
          ...retry,
        },
      }),
    ).toEqual({
      allowAutoTopicCreation: true,
      retry,
    });
  });
});

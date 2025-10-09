import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { AppKafkaConfig } from './app.kafka.config';

describe(AppKafkaConfig.name, () => {
  it('default', async () => {
    const config = new MockConfigService() as ConfigService;
    const kafkaConfig = new AppKafkaConfig(config);

    expect({
      getKafkaBrokers: kafkaConfig.getKafkaBrokers(),
      getKafkaClientId: kafkaConfig.getKafkaClientId(),
      getKafkaGroupId: kafkaConfig.getKafkaGroupId(),
      getKafkaRetryStatusCodes: kafkaConfig.getKafkaRetryStatusCodes(),
    }).toEqual({
      getKafkaBrokers: [],
      getKafkaClientId: undefined,
      getKafkaGroupId: undefined,
      getKafkaRetryStatusCodes: [],
    });
  });

  it('custom', async () => {
    const config = new MockConfigService({
      KAFKA_BROKERS: 'broker1,broker2',
      KAFKA_RETRY_STATUS_CODES: 'timeout,23',
      KAFKA_CLIENT_ID: 'kafka-client',
      KAFKA_GROUP_ID: 'kafka-group',
    }) as ConfigService;
    const kafkaConfig = new AppKafkaConfig(config);

    expect({
      getKafkaBrokers: kafkaConfig.getKafkaBrokers(),
      getKafkaClientId: kafkaConfig.getKafkaClientId(),
      getKafkaGroupId: kafkaConfig.getKafkaGroupId(),
      getKafkaRetryStatusCodes: kafkaConfig.getKafkaRetryStatusCodes(),
    }).toEqual({
      getKafkaBrokers: ['broker1', 'broker2'],
      getKafkaClientId: 'kafka-client',
      getKafkaGroupId: 'kafka-group',
      getKafkaRetryStatusCodes: ['timeout', 23],
    });
  });
});

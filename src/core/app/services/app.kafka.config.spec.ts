import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { AppKafkaConfig } from './app.kafka.config';

describe(AppKafkaConfig.name, () => {
  it('default', async () => {
    const config = new MockConfigService() as ConfigService;
    const kafkaConfig = new AppKafkaConfig(config);

    expect({
      getKafkaBrokers: kafkaConfig.getBrokers(),
      getKafkaClientId: kafkaConfig.getClientId(),
      getKafkaGroupId: kafkaConfig.getGroupId(),
      getKafkaRetryStatusCodes: kafkaConfig.getRetryStatusCodes(),
    }).toEqual({
      getKafkaBrokers: [],
      getKafkaClientId: undefined,
      getKafkaGroupId: 'default-group',
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
      getKafkaBrokers: kafkaConfig.getBrokers(),
      getKafkaClientId: kafkaConfig.getClientId(),
      getKafkaGroupId: kafkaConfig.getGroupId(),
      getKafkaRetryStatusCodes: kafkaConfig.getRetryStatusCodes(),
    }).toEqual({
      getKafkaBrokers: ['broker1', 'broker2'],
      getKafkaClientId: 'kafka-client',
      getKafkaGroupId: 'kafka-group',
      getKafkaRetryStatusCodes: ['timeout', 23],
    });
  });
});

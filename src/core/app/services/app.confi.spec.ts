import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { AppConfig } from './app.config';

describe(AppConfig.name, () => {
  it('default', async () => {
    const config = new MockConfigService() as ConfigService;
    const appConfig = new AppConfig(config);

    expect({
      getServicePort: appConfig.getServicePort(),
      getGrpcHost: appConfig.getGrpcHost(),
      getGrpcPort: appConfig.getGrpcPort(),
      getCorsOptions: appConfig.getCorsOptions(),
      getKafkaBrokers: appConfig.getKafkaBrokers(),
      getKafkaClientId: appConfig.getKafkaClientId(),
      getKafkaGroupId: appConfig.getKafkaGroupId(),
      getKafkaRetryStatusCodes: appConfig.getKafkaRetryStatusCodes(),
    }).toEqual({
      getServicePort: 3000,
      getGrpcHost: '0.0.0.0',
      getGrpcPort: 0,
      getCorsOptions: { origin: '*' },
      getKafkaBrokers: [],
      getKafkaClientId: undefined,
      getKafkaGroupId: undefined,
      getKafkaRetryStatusCodes: [],
    });
  });

  it('custom', async () => {
    const config = new MockConfigService({
      SERVICE_PORT: '1001',
      GRPC_HOST: '127.0.0.1',
      GRPC_PORT: '1002',
      CORS_OPTIONS: '{}',
      KAFKA_BROKERS: 'broker1,broker2',
      KAFKA_RETRY_STATUS_CODES: 'timeout,23',
      KAFKA_CLIENT_ID: 'kafka-client',
      KAFKA_GROUP_ID: 'kafka-group',
    }) as ConfigService;
    const appConfig = new AppConfig(config);

    expect({
      getServicePort: appConfig.getServicePort(),
      getGrpcHost: appConfig.getGrpcHost(),
      getGrpcPort: appConfig.getGrpcPort(),
      getCorsOptions: appConfig.getCorsOptions(),
      getKafkaBrokers: appConfig.getKafkaBrokers(),
      getKafkaClientId: appConfig.getKafkaClientId(),
      getKafkaGroupId: appConfig.getKafkaGroupId(),
      getKafkaRetryStatusCodes: appConfig.getKafkaRetryStatusCodes(),
    }).toEqual({
      getServicePort: 1001,
      getGrpcHost: '127.0.0.1',
      getGrpcPort: 1002,
      getCorsOptions: {},
      getKafkaBrokers: ['broker1', 'broker2'],
      getKafkaClientId: 'kafka-client',
      getKafkaGroupId: 'kafka-group',
      getKafkaRetryStatusCodes: ['timeout', 23],
    });
  });

  it('corsOptions as empty', async () => {
    const config = new MockConfigService({
      CORS_OPTIONS: ' ',
    }) as ConfigService;
    const appConfig = new AppConfig(config);

    expect(appConfig.getCorsOptions()).toBeUndefined();
  });
});

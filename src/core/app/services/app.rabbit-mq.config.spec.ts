import { ConfigService } from '@nestjs/config';
import { RABBIT_MQ_DEFAULT_URL_PARAMS } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockConfigService } from 'tests/nestjs';
import { AppRabbitMqConfig } from './app.rabbit-mq.config';

describe(AppRabbitMqConfig.name, () => {
  it('default', async () => {
    const config = new MockConfigService() as ConfigService;
    const rabbitMqConfig = new AppRabbitMqConfig(config);

    expect({
      getUrls: rabbitMqConfig.getUrls(),
      getUser: rabbitMqConfig.getUser(),
      getPass: rabbitMqConfig.getPass(),
      getRetryConfig: rabbitMqConfig.getRetryConfig(),
    }).toEqual({
      getUrls: [],
      getUser: undefined,
      getPass: undefined,
      getRetryConfig: {
        heartbeatIntervalInSeconds: 5,
        reconnectTimeInSeconds: 10,
      },
    });
  });

  it('custom', async () => {
    const config = new MockConfigService({
      RABBIT_MQ_URLS: 'broker1,broker2:5673',
      RABBIT_MQ_USER: 'user',
      RABBIT_MQ_PASSWORD: 'pass',
    }) as ConfigService;
    const rabbitMqConfig = new AppRabbitMqConfig(config);

    expect({
      getUrls: rabbitMqConfig.getUrls(),
      getUser: rabbitMqConfig.getUser(),
      getPass: rabbitMqConfig.getPass(),
      getRetryConfig: rabbitMqConfig.getRetryConfig(),
    }).toEqual({
      getUrls: [
        {
          ...RABBIT_MQ_DEFAULT_URL_PARAMS,
          hostname: 'broker1',
          port: 5672,
          username: 'user',
          password: 'pass',
        },
        {
          ...RABBIT_MQ_DEFAULT_URL_PARAMS,
          hostname: 'broker2',
          port: 5673,
          username: 'user',
          password: 'pass',
        },
      ],
      getUser: 'user',
      getPass: 'pass',
      getRetryConfig: {
        heartbeatIntervalInSeconds: 5,
        reconnectTimeInSeconds: 10,
      },
    });
  });
});

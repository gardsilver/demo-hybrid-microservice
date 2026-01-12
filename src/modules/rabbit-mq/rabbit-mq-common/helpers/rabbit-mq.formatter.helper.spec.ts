import { faker } from '@faker-js/faker';
import { RMQErrorInfo } from '../types/types';
import { RabbitMqFormatterHelper } from './rabbit-mq.formatter.helper';
import { RABBIT_MQ_DEFAULT_URL_PARAMS } from '../types/constants';

describe(RabbitMqFormatterHelper.name, () => {
  let hostname;
  let errorInfo: RMQErrorInfo;

  beforeEach(async () => {
    hostname = faker.string.alpha(7);
    errorInfo = {
      err: new Error('Test error'),
      url: {
        hostname,
        username: faker.string.alpha(7),
        password: faker.string.alpha(7),
      },
    };
  });

  it('errorInfoFormat', async () => {
    expect(RabbitMqFormatterHelper.errorInfoFormat()).toBeUndefined();
    expect(RabbitMqFormatterHelper.errorInfoFormat(undefined)).toBeUndefined();
    expect(RabbitMqFormatterHelper.errorInfoFormat(errorInfo)).toEqual({
      ...errorInfo,
      url: {
        hostname,
        username: ' ***** ',
        password: ' ***** ',
      },
    });

    expect(
      RabbitMqFormatterHelper.errorInfoFormat({
        ...errorInfo,
        url: {
          hostname,
        },
      }),
    ).toEqual({
      ...errorInfo,
      url: {
        hostname,
      },
    });

    expect(
      RabbitMqFormatterHelper.errorInfoFormat({
        ...errorInfo,
        url: hostname,
      }),
    ).toEqual({
      ...errorInfo,
      url: hostname,
    });
  });

  it('parseUrl', async () => {
    expect(RabbitMqFormatterHelper.parseUrl('')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
    });

    expect(() => RabbitMqFormatterHelper.parseUrl(':60')).toThrow('Invalid URL');

    expect(RabbitMqFormatterHelper.parseUrl('/path')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      vhost: '/path',
    });

    expect(RabbitMqFormatterHelper.parseUrl('rabbitmq')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      hostname: 'rabbitmq',
    });

    expect(RabbitMqFormatterHelper.parseUrl('rabbitmq/path')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      hostname: 'rabbitmq',
      vhost: '/path',
    });

    expect(RabbitMqFormatterHelper.parseUrl('rabbitmq:60')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      hostname: 'rabbitmq',
      port: 60,
    });

    expect(RabbitMqFormatterHelper.parseUrl('rabbitmq:60/path')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      hostname: 'rabbitmq',
      port: 60,
      vhost: '/path',
    });

    expect(RabbitMqFormatterHelper.parseUrl('rmq://rabbitmq:60')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      protocol: 'rmq',
      hostname: 'rabbitmq',
      port: 60,
    });

    expect(RabbitMqFormatterHelper.parseUrl('rmq://rabbitmq:60/path')).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
      protocol: 'rmq',
      hostname: 'rabbitmq',
      port: 60,
      vhost: '/path',
    });

    expect(RabbitMqFormatterHelper.parseUrl({})).toEqual({
      ...RABBIT_MQ_DEFAULT_URL_PARAMS,
    });

    expect(
      RabbitMqFormatterHelper.parseUrl({
        protocol: 'rmq',
        hostname: 'rabbitmq',
        port: 60,
        vhost: '/path',
      }),
    ).toEqual({
      protocol: 'rmq',
      hostname: 'rabbitmq',
      port: 60,
      vhost: '/path',
    });
  });
});

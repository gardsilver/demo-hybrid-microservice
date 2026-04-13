import { IRMQErrorInfo } from '../types/types';
import { IRabbitMqErrorData, RabbitMqError } from './rabbit-mq.error';

describe(RabbitMqError.name, () => {
  let error: Error;
  let errorInfo: IRMQErrorInfo;
  let rabbitMqError: RabbitMqError;

  beforeEach(async () => {
    error = new Error('Test Error');

    errorInfo = {
      url: 'rmq://rabbitmq:60/path',
      err: error,
    };
  });

  it('constructor', async () => {
    rabbitMqError = new RabbitMqError(undefined, undefined as unknown as IRabbitMqErrorData);

    expect(rabbitMqError.data).toBeUndefined();
    expect(rabbitMqError.message).toBe('RabbitMq Unknown Error');
    expect(rabbitMqError.cause).toBeUndefined();

    rabbitMqError = new RabbitMqError(
      'Connection failed',
      {
        serverName: 'server',
        url: {
          protocol: 'rmq',
          hostname: 'rabbitmq',
          port: 60,
          vhost: '/path',
        },
      },
      error,
    );

    expect(rabbitMqError.data).toEqual({
      serverName: 'server',
      url: {
        protocol: 'rmq',
        hostname: 'rabbitmq',
        port: 60,
        vhost: '/path',
      },
    });
    expect(rabbitMqError.message).toBe('Connection failed');
    expect(rabbitMqError.cause).toEqual(error);
  });

  it('buildFromRMQErrorInfo', async () => {
    rabbitMqError = RabbitMqError.buildFromRMQErrorInfo(
      undefined as unknown as string,
      undefined as unknown as string,
      undefined as unknown as IRMQErrorInfo,
    );

    expect(rabbitMqError.data).toEqual({});
    expect(rabbitMqError.message).toBe('RabbitMq Unknown Error');
    expect(rabbitMqError.cause).toBeUndefined();

    rabbitMqError = RabbitMqError.buildFromRMQErrorInfo('server', 'failed', errorInfo);

    expect(rabbitMqError.data).toEqual({
      serverName: 'server',
      url: {
        protocol: 'rmq',
        hostname: 'rabbitmq',
        port: 60,
        vhost: '/path',
      },
      eventType: 'failed',
    });
    expect(rabbitMqError.message).toBe(error.message);
    expect(rabbitMqError.cause).toEqual(error);
  });
});

import { RabbitMqError } from '../../errors/rabbit-mq.error';
import { RMQErrorInfo } from '../../types/types';
import { RabbitMqErrorObjectFormatter } from './rabbit-mq.error.object-formatter';

describe(RabbitMqErrorObjectFormatter.name, () => {
  let error: Error;
  let errorInfo: RMQErrorInfo;
  let rabbitMqError: RabbitMqError;
  let formatter: RabbitMqErrorObjectFormatter;

  beforeEach(async () => {
    formatter = new RabbitMqErrorObjectFormatter();

    error = new Error('Test Error');

    errorInfo = {
      url: 'rmq://rabbitmq:60/path',
      err: error,
    };

    rabbitMqError = RabbitMqError.buildFromRMQErrorInfo('server', 'failed', errorInfo);
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(error)).toBeFalsy();
    expect(formatter.isInstanceOf(errorInfo)).toBeFalsy();
    expect(formatter.isInstanceOf(rabbitMqError)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(rabbitMqError)).toEqual({
      data: {
        serverName: 'server',
        url: {
          protocol: 'rmq',
          hostname: 'rabbitmq',
          port: 60,
          vhost: '/path',
        },
        eventType: 'failed',
      },
    });
  });
});

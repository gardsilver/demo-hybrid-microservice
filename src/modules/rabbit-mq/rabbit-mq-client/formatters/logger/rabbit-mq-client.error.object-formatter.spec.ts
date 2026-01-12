import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientError } from '../../errors/rabbit-mq-client.error';
import { RabbitMqClientInternalError } from '../../errors/rabbit-mq-client.internal.error';
import { RabbitMqClientErrorObjectFormatter } from './rabbit-mq-client.error.object-formatter';

describe(RabbitMqClientErrorObjectFormatter.name, () => {
  let message: string;
  let statusCode: string | number;
  let cause: unknown;

  let error: Error;
  let clientError: RabbitMqClientError;
  let formatter: RabbitMqClientErrorObjectFormatter;

  beforeEach(async () => {
    formatter = new RabbitMqClientErrorObjectFormatter();

    message = faker.string.alpha(10);
    statusCode = faker.number.int(2) > 1 ? faker.string.alpha(10) : faker.number.int(8);
    cause = {
      details: faker.string.alpha(10),
    };

    clientError = new RabbitMqClientInternalError('Server error', statusCode, cause);
    clientError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    error = new Error(message);
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf([{}])).toBeFalsy();
    expect(formatter.isInstanceOf(cause)).toBeFalsy();
    expect(formatter.isInstanceOf(error)).toBeFalsy();
    expect(formatter.isInstanceOf(clientError)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(clientError)).toEqual({
      statusCode: statusCode,
      loggerMarker: LoggerMarkers.INTERNAL,
    });
  });
});

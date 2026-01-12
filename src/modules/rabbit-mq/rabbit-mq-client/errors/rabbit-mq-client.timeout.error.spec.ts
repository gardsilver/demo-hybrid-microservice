import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientTimeoutError } from './rabbit-mq-client.timeout.error';

describe(RabbitMqClientTimeoutError.name, () => {
  let message: string;
  let cause: unknown;

  beforeEach(async () => {
    message = faker.string.alpha(10);
    cause = {
      details: faker.string.alpha(10),
    };
  });

  it('constructor', async () => {
    let error: RabbitMqClientTimeoutError;

    error = new RabbitMqClientTimeoutError(undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Timeout Error',
      message: 'Timeout RabbitMq Server Error',
      statusCode: 'timeout',
      loggerMarker: LoggerMarkers.EXTERNAL,
    });

    error = new RabbitMqClientTimeoutError(undefined, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Timeout Error',
      message: 'Timeout RabbitMq Server Error',
      statusCode: 'timeout',
      loggerMarker: LoggerMarkers.EXTERNAL,
    });

    error = new RabbitMqClientTimeoutError(message, cause);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Timeout Error',
      message,
      statusCode: 'timeout',
      loggerMarker: LoggerMarkers.EXTERNAL,
      cause,
    });
  });
});

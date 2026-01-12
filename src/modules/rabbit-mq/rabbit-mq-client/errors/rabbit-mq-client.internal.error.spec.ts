import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientInternalError } from './rabbit-mq-client.internal.error';

describe(RabbitMqClientInternalError.name, () => {
  let message: string;
  let statusCode: string | number;
  let cause: unknown;

  beforeEach(async () => {
    message = faker.string.alpha(10);
    statusCode = faker.number.int(2) > 1 ? faker.string.alpha(10) : faker.number.int(8);
    cause = {
      details: faker.string.alpha(10),
    };
  });

  it('constructor', async () => {
    let error: RabbitMqClientInternalError;

    error = new RabbitMqClientInternalError(undefined, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Internal Error',
      message: 'Internal RabbitMq Server Error',
      statusCode: 'UnknownError',
      loggerMarker: LoggerMarkers.INTERNAL,
    });

    error = new RabbitMqClientInternalError(undefined, undefined, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Internal Error',
      message: 'Internal RabbitMq Server Error',
      statusCode: 'UnknownError',
      loggerMarker: LoggerMarkers.INTERNAL,
    });

    error = new RabbitMqClientInternalError(message, statusCode, cause);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Internal Error',
      message,
      statusCode,
      loggerMarker: LoggerMarkers.INTERNAL,
      cause,
    });
  });
});

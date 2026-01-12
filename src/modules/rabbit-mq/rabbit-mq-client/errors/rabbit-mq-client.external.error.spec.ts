import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientExternalError } from './rabbit-mq-client.external.error';

describe(RabbitMqClientExternalError.name, () => {
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
    let error: RabbitMqClientExternalError;

    error = new RabbitMqClientExternalError(undefined, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client External Error',
      message: 'External RabbitMq Server Error',
      statusCode: 'UnknownError',
      loggerMarker: LoggerMarkers.EXTERNAL,
    });

    error = new RabbitMqClientExternalError(undefined, undefined, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client External Error',
      message: 'External RabbitMq Server Error',
      statusCode: 'UnknownError',
      loggerMarker: LoggerMarkers.EXTERNAL,
    });

    error = new RabbitMqClientExternalError(message, statusCode, cause);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client External Error',
      message,
      statusCode,
      loggerMarker: LoggerMarkers.EXTERNAL,
      cause,
    });
  });
});

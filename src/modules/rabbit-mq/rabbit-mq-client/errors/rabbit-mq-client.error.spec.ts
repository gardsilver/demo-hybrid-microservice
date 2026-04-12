import { faker } from '@faker-js/faker';
import { RabbitMqClientError } from './rabbit-mq-client.error';

class TestRabbitMqError extends RabbitMqClientError {
  constructor(
    message: string | undefined,
    statusCode: string | number | undefined,
    loggerMarker: string,
    cause?: unknown,
  ) {
    super(message, statusCode, loggerMarker, cause);
  }
}

describe(RabbitMqClientError.name, () => {
  let message: string;
  let statusCode: string | number;
  let loggerMarker: string;
  let cause: unknown;

  beforeEach(async () => {
    message = faker.string.alpha(10);
    statusCode = faker.number.int(2) > 1 ? faker.string.alpha(10) : faker.number.int(8);
    loggerMarker = faker.string.alpha(10);
    cause = {
      details: faker.string.alpha(10),
    };
  });

  it('constructor', async () => {
    let error: RabbitMqClientError;

    error = new TestRabbitMqError(undefined, undefined, undefined as unknown as string);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Error',
      message: 'RabbitMq Server Unknown Error',
      statusCode: 'UnknownError',
    });

    error = new TestRabbitMqError(undefined, undefined, undefined as unknown as string, undefined);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Error',
      message: 'RabbitMq Server Unknown Error',
      statusCode: 'UnknownError',
    });

    error = new TestRabbitMqError(message, statusCode, loggerMarker, cause);
    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      loggerMarker: error.loggerMarker,
      cause: error.cause,
    }).toEqual({
      name: 'RabbitMq Client Error',
      message,
      statusCode,
      loggerMarker,
      cause,
    });
  });
});

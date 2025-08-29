import { faker } from '@faker-js/faker';
import { Metadata } from '@grpc/grpc-js';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcClientError, isGrpcServiceError } from './grpc-client.error';

describe('isGrpcServiceError', () => {
  it('isGrpcServiceError', async () => {
    expect(isGrpcServiceError(undefined)).toBeFalsy();
    expect(isGrpcServiceError(null)).toBeFalsy();
    expect(isGrpcServiceError(NaN)).toBeFalsy();
    expect(isGrpcServiceError(faker.string.sample())).toBeFalsy();
    expect(isGrpcServiceError(faker.string.numeric())).toBeFalsy();
    expect(isGrpcServiceError(faker.number.int())).toBeFalsy();
    expect(isGrpcServiceError({})).toBeFalsy();
    expect(isGrpcServiceError([])).toBeFalsy();

    const error = new Error();

    expect(isGrpcServiceError(error)).toBeFalsy();

    error['code'] = faker.number.int();
    error['metadata'] = null;
    expect(isGrpcServiceError(error)).toBeTruthy();

    error['metadata'] = new Metadata();
    expect(isGrpcServiceError(error)).toBeTruthy();

    error['code'] = undefined;
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['code'] = faker.string.sample();
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['code'] = faker.string.numeric();
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['code'] = faker.number.int();
    error['metadata'] = undefined;
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['metadata'] = faker.number.int();
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['metadata'] = faker.string.sample();
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['metadata'] = { status: faker.string.sample() };
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['details'] = undefined;
    error['metadata'] = null;
    expect(isGrpcServiceError(error)).toBeTruthy();

    error['details'] = faker.string.sample();
    expect(isGrpcServiceError(error)).toBeTruthy();

    error['details'] = null;
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['details'] = faker.number.int();
    expect(isGrpcServiceError(error)).toBeFalsy();

    error['details'] = { status: faker.string.sample() };
    expect(isGrpcServiceError(error)).toBeFalsy();
  });
});

describe('GrpcClientError', () => {
  class CustomGrpcClientError extends GrpcClientError {
    constructor(message: string, statusCode: string | number, loggerMarker: string, cause?: unknown) {
      super(message, statusCode, loggerMarker, cause);
    }
  }

  it('default', async () => {
    const error = new CustomGrpcClientError(undefined, undefined, undefined);

    expect({
      message: error.message,
      loggerMarker: error.loggerMarker,
      statusCode: error.statusCode,
      details: error.details,
      headers: error.headers,
      cause: error.cause,
    }).toEqual({
      message: 'gRPC Server Unknown Error',
      statusCode: 'UnknownError',
    });
  });

  it('with string error', async () => {
    const error = new CustomGrpcClientError('Test Error', 1, 'marker', 'Error');

    expect({
      message: error.message,
      loggerMarker: error.loggerMarker,
      statusCode: error.statusCode,
      details: error.details,
      headers: error.headers,
      cause: error.cause,
    }).toEqual({
      message: 'Test Error',
      loggerMarker: 'marker',
      statusCode: 1,
      cause: 'Error',
    });
  });

  it('with ServiceError', async () => {
    const headers = grpcHeadersFactory.build({ programsIds: ['1', '2'] });
    const grpcError = new Error();
    grpcError['code'] = 1;
    grpcError['metadata'] = grpcMetadataFactory.build(headers);

    let error = new CustomGrpcClientError('Test Error', 'timeout', 'marker', grpcError);

    expect({
      message: error.message,
      loggerMarker: error.loggerMarker,
      statusCode: error.statusCode,
      details: error.details,
      headers: error.headers,
      cause: error.cause,
    }).toEqual({
      message: 'Test Error',
      loggerMarker: 'marker',
      statusCode: 'timeout',
      headers: {
        programsids: ['1', '2'],
      },
      cause: grpcError,
    });

    grpcError['metadata'] = null;

    error = new CustomGrpcClientError('Test Error', 'timeout', 'marker', grpcError);

    expect({
      message: error.message,
      loggerMarker: error.loggerMarker,
      statusCode: error.statusCode,
      details: error.details,
      headers: error.headers,
      cause: error.cause,
    }).toEqual({
      message: 'Test Error',
      loggerMarker: 'marker',
      statusCode: 'timeout',
      headers: undefined,
      cause: grpcError,
    });
  });
});

import { GrpcClientInternalError } from './grpc-client.internal.error';

describe(GrpcClientInternalError.name, () => {
  it('default', async () => {
    const error = new GrpcClientInternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'Internal gRPC Server Error',
      statusCode: 'UnknownError',
    });
  });
});

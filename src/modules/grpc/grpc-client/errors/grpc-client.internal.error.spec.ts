import { GrpcClientInternalException } from './grpc-client.internal.error';

describe(GrpcClientInternalException.name, () => {
  it('default', async () => {
    const error = new GrpcClientInternalException(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'Internal gRPC Server Error',
      statusCode: 'UnknownError',
    });
  });
});

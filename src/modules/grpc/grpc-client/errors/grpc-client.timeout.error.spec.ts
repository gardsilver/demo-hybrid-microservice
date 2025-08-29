import { GrpcClientTimeoutError } from './grpc-client.timeout.error';

describe(GrpcClientTimeoutError.name, () => {
  it('default', async () => {
    const error = new GrpcClientTimeoutError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'gRPC Server Timeout Error',
      statusCode: 'timeout',
    });
  });
});

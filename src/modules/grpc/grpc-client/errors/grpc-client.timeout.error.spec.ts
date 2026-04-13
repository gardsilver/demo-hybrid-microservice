import { GrpcClientTimeoutError } from './grpc-client.timeout.error';

describe(GrpcClientTimeoutError.name, () => {
  it('default', async () => {
    const error = new GrpcClientTimeoutError(undefined as unknown as string, undefined as unknown as string);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'gRPC Server Timeout Error',
      statusCode: 'timeout',
    });
  });
});

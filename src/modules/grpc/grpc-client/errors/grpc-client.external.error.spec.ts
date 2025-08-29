import { GrpcClientExternalException } from './grpc-client.external.error';

describe(GrpcClientExternalException.name, () => {
  it('default', async () => {
    const error = new GrpcClientExternalException(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'External gRPC Server Error',
      statusCode: 'UnknownError',
    });
  });
});

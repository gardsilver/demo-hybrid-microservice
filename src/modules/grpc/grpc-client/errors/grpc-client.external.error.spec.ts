import { GrpcClientExternalError } from './grpc-client.external.error';

describe(GrpcClientExternalError.name, () => {
  it('default', async () => {
    const error = new GrpcClientExternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
    }).toEqual({
      message: 'External gRPC Server Error',
      statusCode: 'UnknownError',
    });
  });
});

import { Metadata, status as GrpcStatus, ServiceError } from '@grpc/grpc-js';
import { IHeaders } from 'src/modules/common';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcClientErrorFormatter } from './grpc-client.error.object-formatter';
import { GrpcClientError } from '../../errors/grpc-client.error';
import { GrpcClientExternalError } from '../../errors/grpc-client.external.error';

describe(GrpcClientErrorFormatter.name, () => {
  let headers: IHeaders;
  let metadata: Metadata;
  let serverError: ServiceError;
  let error: GrpcClientError;
  let formatter: GrpcClientErrorFormatter;

  beforeEach(async () => {
    formatter = new GrpcClientErrorFormatter();

    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );

    metadata = grpcMetadataFactory.build(headers);

    serverError = new Error('Test Error Server') as ServiceError;
    serverError.code = GrpcStatus.INTERNAL;
    serverError.metadata = metadata;

    error = new GrpcClientExternalError('Tets Error', 'status', serverError);
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(serverError)).toBeFalsy();
    expect(formatter.isInstanceOf(error)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(error)).toEqual({
      statusCode: 'status',
      headers: GrpcHeadersHelper.normalize(metadata.getMap()),
    });
  });
});

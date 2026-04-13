import { Metadata, status as GrpcStatus, ServiceError } from '@grpc/grpc-js';
import { IHeaders } from 'src/modules/common';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcServiceErrorFormatter } from './grpc-service-error.object-formatter';

describe(GrpcServiceErrorFormatter.name, () => {
  let headers: IHeaders;
  let metadata: Metadata;
  let serverError: ServiceError;
  let formatter: GrpcServiceErrorFormatter;

  beforeEach(async () => {
    formatter = new GrpcServiceErrorFormatter();

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
    serverError.metadata = null as unknown as Metadata;
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(serverError)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(serverError)).toEqual({
      code: GrpcStatus.INTERNAL,
      metadata: null,
    });

    serverError.metadata = metadata;

    expect(formatter.transform(serverError)).toEqual({
      code: GrpcStatus.INTERNAL,
      metadata: GrpcHeadersHelper.normalize(metadata.getMap()),
    });
  });
});

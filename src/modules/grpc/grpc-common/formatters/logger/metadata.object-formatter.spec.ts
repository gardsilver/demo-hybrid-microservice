import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { IHeaders } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { MetadataObjectFormatter } from './metadata.object-formatter';
import { GrpcHeadersHelper } from '../../helpers/grpc.headers.helper';

describe(MetadataObjectFormatter.name, () => {
  let headers: IHeaders;
  let metadata: Metadata;
  let formatter: MetadataObjectFormatter;

  beforeEach(async () => {
    formatter = new MetadataObjectFormatter();

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
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(new RpcException('Test Error'))).toBeFalsy();
    expect(formatter.isInstanceOf(metadata)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(metadata)).toEqual(GrpcHeadersHelper.normalize(metadata.getMap()));
  });
});

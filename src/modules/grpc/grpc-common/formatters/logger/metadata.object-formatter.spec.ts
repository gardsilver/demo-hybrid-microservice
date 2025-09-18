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

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat('')).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(new RpcException('Test Error'))).toBeFalsy();
    expect(formatter.canFormat(metadata)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(metadata)).toEqual(GrpcHeadersHelper.normalize(metadata.getMap()));
  });
});

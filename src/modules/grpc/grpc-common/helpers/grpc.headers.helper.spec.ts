import { BaseHeadersHelper } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcHeadersHelper } from './grpc.headers.helper';

describe(GrpcHeadersHelper.name, () => {
  it('normalize', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          asArray: true,
        },
      },
    );

    const grpcHeadersRaw = grpcHeadersFactory.build(headers);

    const metadata = grpcMetadataFactory.build(headers);
    const metadataRaw = grpcMetadataFactory.build(grpcHeadersRaw);

    expect(metadata.getMap()).toEqual(metadataRaw.getMap());
    expect(GrpcHeadersHelper.normalize(metadata.getMap())).toEqual(BaseHeadersHelper.normalize(headers));
    expect(GrpcHeadersHelper.normalize(metadataRaw.getMap())).toEqual(BaseHeadersHelper.normalize(headers));
  });
});

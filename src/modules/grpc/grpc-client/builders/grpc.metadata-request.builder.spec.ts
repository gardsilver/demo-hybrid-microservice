import { faker } from '@faker-js/faker';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from 'src/modules/http/http-common';
import { GrpcMetadataBuilder } from 'src/modules/grpc/grpc-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcMetadataRequestBuilder } from './grpc.metadata-request.builder';
import { IGrpcMetadataRequestBuilder } from '../types/types';

describe(GrpcMetadataRequestBuilder.name, () => {
  let asyncContext: IGeneralAsyncContext;
  let metadataRequestBuilder: IGrpcMetadataRequestBuilder;

  beforeEach(async () => {
    asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
      {
        transient: {
          requestId: faker.string.uuid(),
          correlationId: faker.string.uuid(),
        },
      },
    );
    metadataRequestBuilder = new GrpcMetadataRequestBuilder();
  });

  it('build', async () => {
    const spy = jest.spyOn(GrpcMetadataBuilder.prototype, 'build');

    metadataRequestBuilder.build({ asyncContext }, { useZipkin: true });

    expect(spy).toHaveBeenCalledWith({ asyncContext }, { useZipkin: true });
  });

  it('build with authToken', async () => {
    const token = faker.string.alpha(20);

    const metadata = metadataRequestBuilder.build({ asyncContext }, { authToken: token });

    expect(metadata.getMap()[AUTHORIZATION_HEADER_NAME]).toEqual(`${BEARER_NAME} ${token}`);
  });
});

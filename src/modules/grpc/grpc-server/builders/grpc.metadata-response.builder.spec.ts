import { faker } from '@faker-js/faker';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcMetadataResponseBuilder } from './grpc.metadata-response.builder';
import { IGrpcMetadataResponseBuilder } from '../types/types';
import { GrpcMetadataBuilder } from '../../grpc-common';

describe(GrpcMetadataResponseBuilder.name, () => {
  let asyncContext: IGeneralAsyncContext;
  let metadataResponseBuilder: IGrpcMetadataResponseBuilder;

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
    metadataResponseBuilder = new GrpcMetadataResponseBuilder();
  });

  it('build', async () => {
    const spy = jest.spyOn(GrpcMetadataBuilder.prototype, 'build');

    metadataResponseBuilder.build({ asyncContext }, {});

    expect(spy).toHaveBeenCalledWith({ asyncContext }, {});
  });
});

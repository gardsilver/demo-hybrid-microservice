import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { Metadata } from '@grpc/grpc-js';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AccessRoles, AuthStatus, IAuthInfo } from 'src/modules/auth';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from 'src/modules/http/http-server';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcMetadataHelper } from './grpc.metadata.helper';

describe(GrpcMetadataHelper.name, () => {
  let requestMetadata: Metadata;

  beforeEach(async () => {
    requestMetadata = new Metadata();
  });

  it('AsyncContext', async () => {
    const asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
    );

    const copyAsyncContext = merge(asyncContext);

    GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(METADATA_ASYNC_CONTEXT_KEY in requestMetadata).toBeTruthy();
    expect(requestMetadata[METADATA_ASYNC_CONTEXT_KEY]).toEqual(copyAsyncContext);

    const result = GrpcMetadataHelper.getAsyncContext(requestMetadata);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(result).toEqual(copyAsyncContext);
  });

  it('AuthInfo', async () => {
    const authInfo: IAuthInfo = {
      status: AuthStatus.SUCCESS,
      roles: [AccessRoles.ADMIN],
    };
    const copyAuthInfo = merge(authInfo);

    GrpcMetadataHelper.setAuthInfo(authInfo, requestMetadata);

    expect(copyAuthInfo).toEqual(authInfo);
    expect(METADATA_AUTH_INFO_KEY in requestMetadata).toBeTruthy();
    expect(requestMetadata[METADATA_AUTH_INFO_KEY]).toEqual(copyAuthInfo);

    const result = GrpcMetadataHelper.getAuthInfo(requestMetadata);

    expect(copyAuthInfo).toEqual(authInfo);
    expect(result).toEqual(copyAuthInfo);
  });
});

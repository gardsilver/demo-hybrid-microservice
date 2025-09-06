import { merge } from 'ts-deepmerge';
import { Request } from 'express';
import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { AccessRoles, AuthStatus, IAuthInfo } from 'src/modules/auth';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { requestFactory } from 'tests/express';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from '../types/constants';
import { HttpRequestHelper } from './http.request.helper';

describe(HttpRequestHelper.name, () => {
  let headers: IHeaders;
  let request: Request;

  beforeEach(async () => {
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

    request = requestFactory.build({
      method: 'GET',
      route: 'api/test',
      url: 'api/test',
      params: {},
      headers,
    });
  });

  it('AsyncContext', async () => {
    const asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
    );

    const copyAsyncContext = merge(asyncContext);

    HttpRequestHelper.setAsyncContext(asyncContext, request);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(METADATA_ASYNC_CONTEXT_KEY in request).toBeTruthy();
    expect(request[METADATA_ASYNC_CONTEXT_KEY]).toEqual(copyAsyncContext);

    const result = HttpRequestHelper.getAsyncContext(request);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(result).toEqual(copyAsyncContext);
  });

  it('AuthInfo', async () => {
    const authInfo: IAuthInfo = {
      status: AuthStatus.SUCCESS,
      roles: [AccessRoles.ADMIN],
    };
    const copyAuthInfo = merge(authInfo);

    HttpRequestHelper.setAuthInfo(authInfo, request);

    expect(copyAuthInfo).toEqual(authInfo);
    expect(METADATA_AUTH_INFO_KEY in request).toBeTruthy();
    expect(request[METADATA_AUTH_INFO_KEY]).toEqual(copyAuthInfo);

    const result = HttpRequestHelper.getAuthInfo(request);

    expect(copyAuthInfo).toEqual(authInfo);
    expect(result).toEqual(copyAuthInfo);
  });
});

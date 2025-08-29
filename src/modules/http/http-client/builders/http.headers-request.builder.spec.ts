import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder } from 'src/modules/elk-logger';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME, HttpHeadersBuilder } from 'src/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { HttpHeadersRequestBuilder } from './http.headers-request.builder';
import { IHttpHeadersRequestBuilder } from '../types/types';

describe(HttpHeadersRequestBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let builder: IHttpHeadersRequestBuilder;

  beforeEach(async () => {
    builder = new HttpHeadersRequestBuilder();

    traceSpan = TraceSpanBuilder.build();

    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          ...traceSpan,
        },
      },
    );
  });

  it('init', async () => {
    expect(builder).toBeDefined();
  });

  it('default', async () => {
    const spy = jest.spyOn(HttpHeadersBuilder.prototype, 'build');
    builder.build({ asyncContext }, { useZipkin: true });

    expect(spy).toHaveBeenCalledWith({ asyncContext }, { useZipkin: true });
  });

  it('build with authToken', async () => {
    const token = faker.string.alpha(20);

    const headers = builder.build({ asyncContext }, { authToken: token });

    expect(headers[AUTHORIZATION_HEADER_NAME]).toEqual(`${BEARER_NAME} ${token}`);
  });
});

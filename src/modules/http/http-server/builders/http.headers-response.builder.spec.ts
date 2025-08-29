import { IGeneralAsyncContext } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder } from 'src/modules/elk-logger';
import { HttpHeadersBuilder } from 'src/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { HttpHeadersResponseBuilder } from './http.headers-response.builder';
import { IHttpHeadersResponseBuilder } from '../types/types';

describe(HttpHeadersResponseBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let builder: IHttpHeadersResponseBuilder;

  beforeEach(async () => {
    builder = new HttpHeadersResponseBuilder();

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
});

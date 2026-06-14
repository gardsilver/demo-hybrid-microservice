import { Metadata } from '@grpc/grpc-js';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { CRYPTO_MOCK } from 'tests/crypto';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcMetadataBuilder } from './grpc.metadata.builder';
import { IGrpcMetadataBuilder } from '../types/types';

describe(GrpcMetadataBuilder.name, () => {
  let asyncContext: IGeneralAsyncContext;
  let metadataResponseBuilder: IGrpcMetadataBuilder;

  beforeEach(async () => {
    asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
      }) as unknown as IGeneralAsyncContext,
      {
        transient: {
          requestId: CRYPTO_MOCK.randomUUID(),
          correlationId: CRYPTO_MOCK.randomUUID(),
        },
      },
    );
    metadataResponseBuilder = new GrpcMetadataBuilder();
  });

  it('default', async () => {
    if (asyncContext.traceId === undefined || asyncContext.spanId === undefined) {
      throw new Error('asyncContext is not fully populated');
    }

    expect(metadataResponseBuilder.build({ asyncContext }).getMap()).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });
  });

  it('use request metadata', async () => {
    if (
      asyncContext.traceId === undefined ||
      asyncContext.spanId === undefined ||
      asyncContext.correlationId === undefined ||
      asyncContext.requestId === undefined
    ) {
      throw new Error('asyncContext is not fully populated');
    }

    const metadata = new Metadata();
    metadata.set(HttpGeneralAsyncContextHeaderNames.TRACE_ID, asyncContext.traceId);
    metadata.set(HttpGeneralAsyncContextHeaderNames.SPAN_ID, asyncContext.spanId);
    metadata.set(HttpGeneralAsyncContextHeaderNames.CORRELATION_ID, asyncContext.correlationId);
    metadata.set(HttpGeneralAsyncContextHeaderNames.REQUEST_ID, asyncContext.requestId);
    metadata.set(AUTHORIZATION_HEADER_NAME, 'token');

    expect(
      metadataResponseBuilder
        .build({
          asyncContext: {} as IGeneralAsyncContext,
          metadata,
        })
        .getMap(),
    ).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });
  });

  it('asArray option splits values by dash', async () => {
    if (asyncContext.traceId === undefined || asyncContext.spanId === undefined) {
      throw new Error('asyncContext is not fully populated');
    }

    const result = metadataResponseBuilder.build({ asyncContext }, { asArray: true }).getMap();

    expect(Array.isArray(result[HttpGeneralAsyncContextHeaderNames.TRACE_ID + '-bin'])).toBe(false);
  });
});

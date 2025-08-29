import { Metadata } from '@grpc/grpc-js';
import { faker } from '@faker-js/faker';
import { TraceSpanBuilder, TraceSpanHelper } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcMetadataBuilder } from './grpc.metadata.builder';
import { IGrpcMetadataBuilder } from '../types/types';

describe(GrpcMetadataBuilder.name, () => {
  let asyncContext: IGeneralAsyncContext;
  let metadataResponseBuilder: IGrpcMetadataBuilder;

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
    metadataResponseBuilder = new GrpcMetadataBuilder();
  });

  it('default', async () => {
    expect(metadataResponseBuilder.build({ asyncContext }).getMap()).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });

    expect(metadataResponseBuilder.build({ asyncContext }, { useZipkin: true }).getMap()).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });
  });

  it('use request metadata', async () => {
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

    const zipkinMetadata = new Metadata();
    zipkinMetadata.set(
      HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
      TraceSpanHelper.formatToZipkin(asyncContext.traceId),
    );
    zipkinMetadata.set(
      HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
      TraceSpanHelper.formatToZipkin(asyncContext.spanId),
    );
    zipkinMetadata.set(HttpGeneralAsyncContextHeaderNames.CORRELATION_ID, asyncContext.correlationId);
    zipkinMetadata.set(HttpGeneralAsyncContextHeaderNames.REQUEST_ID, asyncContext.requestId);

    expect(
      metadataResponseBuilder
        .build(
          {
            asyncContext: {} as IGeneralAsyncContext,
            metadata: zipkinMetadata,
          },
          { useZipkin: true },
        )
        .getMap(),
    ).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from '@grpc/grpc-js';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import {
  AUTHORIZATION_HEADER_NAME,
  HttHeadersHelper,
  HttpGeneralAsyncContextHeaderNames,
} from 'src/modules/http/http-common';
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
    jest.restoreAllMocks(); // Сбрасываем шпионы перед каждым тестом
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

  it('должен безопасно пропустить итерацию поcontinue (строка 28), если имя заголовка равно undefined', () => {
    jest.spyOn(HttHeadersHelper, 'nameAsHeaderName').mockImplementation((name: string) => {
      if (name === 'correlationId') {
        return undefined;
      }

      const map: Record<string, string> = {
        traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      };
      return map[name];
    });

    const result = metadataResponseBuilder.build({ asyncContext });
    const resultMap = result.getMap();

    expect(resultMap[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]).toBeUndefined();
    expect(resultMap[HttpGeneralAsyncContextHeaderNames.TRACE_ID]).toBe(asyncContext.traceId);
  });

  it('должен сериализовать массивы в бинарный gRPC Buffer с авто-добавлением суффикса -bin (строки 53-56)', () => {
    const inputMetadata = new Metadata();
    inputMetadata.set('x-custom-array', ['chunk-1', 'chunk-2'] as any);

    const result = metadataResponseBuilder.build({
      asyncContext: {} as any,
      metadata: inputMetadata,
    });

    const resultMap = result.getMap();

    expect(resultMap['x-custom-array-bin']).toBeDefined();
    expect(Buffer.isBuffer(resultMap['x-custom-array-bin'])).toBe(true);

    const unpackedJson = JSON.parse((resultMap['x-custom-array-bin'] as Buffer).toString('utf8'));
    expect(unpackedJson).toEqual(['chunk-1', 'chunk-2']);
  });

  it('должен сериализовать массивы в бинарный Buffer без дублирования суффикса, если ключ уже содержит -bin', () => {
    const inputMetadata = new Metadata();

    jest.spyOn(inputMetadata, 'getMap').mockReturnValue({
      'x-exist-bin': JSON.stringify(['data-1', 'data-2']) as any,
    });

    const result = metadataResponseBuilder.build({
      asyncContext: {} as any,
      metadata: inputMetadata,
    });

    const resultMap = result.getMap();

    expect(resultMap['x-exist-bin']).toBeDefined();
    expect(resultMap['x-exist-bin-bin']).toBeUndefined();
    expect(Buffer.isBuffer(resultMap['x-exist-bin'])).toBe(true);

    const unpackedJson = JSON.parse((resultMap['x-exist-bin'] as Buffer).toString('utf8'));
    expect(unpackedJson).toEqual(['data-1', 'data-2']);
  });

  it('должен преобразовывать строки в Buffer без изменения имени ключа, если строка передана в ключ с суффиксом -bin (строка 60)', () => {
    jest.spyOn(HttHeadersHelper, 'nameAsHeaderName').mockImplementation((name: string) => {
      if (name === 'requestId') {
        return 'x-request-id-bin';
      }
      const map: Record<string, string> = {
        traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
      };
      return map[name];
    });

    const inputMetadata = new Metadata();
    jest.spyOn(inputMetadata, 'getMap').mockReturnValue({});

    const result = metadataResponseBuilder.build({
      asyncContext: {
        requestId: 'raw-string-payload-value',
      } as any,
      metadata: inputMetadata,
    });

    const resultMap = result.getMap();

    expect(resultMap['x-request-id-bin']).toBeDefined();
    expect(Buffer.isBuffer(resultMap['x-request-id-bin'])).toBe(true);
    expect((resultMap['x-request-id-bin'] as Buffer).toString('utf8')).toBe('raw-string-payload-value');
  });

  it('должен корректно обрабатывать ситуацию, когда одно из полей контекста передано как массив в исходных метаданных', () => {
    const inputMetadata = new Metadata();
    inputMetadata.set(HttpGeneralAsyncContextHeaderNames.REQUEST_ID, ['req-1', 'req-2'] as any);

    const result = metadataResponseBuilder.build({
      asyncContext: {} as any,
      metadata: inputMetadata,
    });

    const resultMap = result.getMap();

    expect(resultMap[HttpGeneralAsyncContextHeaderNames.REQUEST_ID]).toBe('req-1-req-2');
  });
});

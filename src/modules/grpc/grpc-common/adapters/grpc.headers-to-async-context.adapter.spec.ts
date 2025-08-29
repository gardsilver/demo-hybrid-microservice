import { HttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { GrpcHeadersToAsyncContextAdapter } from './grpc.headers-to-async-context.adapter';
import { IGrpcHeadersToAsyncContextAdapter } from '../types/types';

describe(GrpcHeadersToAsyncContextAdapter.name, () => {
  let adapter: IGrpcHeadersToAsyncContextAdapter;

  beforeAll(async () => {
    adapter = new GrpcHeadersToAsyncContextAdapter();
  });

  it('Должен вызвать метод HttpHeadersToAsyncContextAdapter.adapt', async () => {
    const headers = httpHeadersFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          useZipkin: true,
        },
      },
    );

    const spyAdapt = jest.spyOn(HttpHeadersToAsyncContextAdapter.prototype, 'adapt');

    adapter.adapt(headers);

    expect(spyAdapt).toHaveBeenCalledWith(headers);
  });
});

import { Metadata } from '@grpc/grpc-js';
import { IGeneralAsyncContext, IHeadersToContextAdapter } from 'src/modules/common';

export interface IGrpcHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IGeneralAsyncContext> {}

export interface IGrpcMetadataBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: { useZipkin?: boolean; asArray?: boolean },
  ): Metadata;
}

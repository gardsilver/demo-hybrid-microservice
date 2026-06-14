import { Metadata } from '@grpc/grpc-js';
import { IHeadersToContextAdapter } from 'src/modules/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';

export interface IGrpcHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IGeneralAsyncContext> {}

export interface IGrpcMetadataBuilderOptions {}

export interface IGrpcMetadataBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: IGrpcMetadataBuilderOptions,
  ): Metadata;
}

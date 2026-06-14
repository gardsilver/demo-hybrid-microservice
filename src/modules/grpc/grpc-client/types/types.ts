import { Metadata } from '@grpc/grpc-js';
import { IGeneralAsyncContext } from 'src/modules/common';
import { IGrpcMetadataBuilder, IGrpcMetadataBuilderOptions as IBuilderOptions } from 'src/modules/grpc/grpc-common';

export interface IGrpcClientProxyBuilderOptions {
  url: string;
  package: string;
  baseDir: string;
  protoPath: string | string[];
  includeDirs?: string[];
  normalizeUrl?: boolean;
}

export interface IGrpcMetadataBuilderOptions extends IBuilderOptions {
  authToken?: string;
}

export interface IGrpcMetadataRequestBuilder extends IGrpcMetadataBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: IGrpcMetadataBuilderOptions,
  ): Metadata;
}

export interface IGrpcRequest<R> {
  service: string;
  method: string;
  data?: R | null;
  metadata?: Metadata;
}

export interface IGrpcRequestOptions {
  metadataBuilderOptions?: IGrpcMetadataBuilderOptions;
  requestOptions?: {
    timeout?: number;
  };
  retryOptions?: {
    retry?: boolean;
    timeout?: number;
    delay?: number;
    retryMaxCount?: number;
    statusCodes?: Array<string | number>;
  };
}

export interface IGrpcResolvedRequestOptions {
  metadataBuilderOptions: IGrpcMetadataBuilderOptions;
  requestOptions: {
    timeout: number;
  };
  retryOptions: {
    retry?: boolean;
    timeout: number;
    delay: number;
    retryMaxCount: number;
    statusCodes?: Array<string | number>;
  };
}

import { Provider } from '@nestjs/common';
import { ImportsType, IServiceClassProvider, IServiceValueProvider, IServiceFactoryProvider } from 'src/modules/common';
import { IGrpcClientProxyBuilderOptions, IGrpcMetadataRequestBuilder, IGrpcRequestOptions } from './types';

export interface IGrpcClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  grpcClientProxyBuilderOptions:
    | IServiceClassProvider<IGrpcClientProxyBuilderOptions>
    | IServiceValueProvider<IGrpcClientProxyBuilderOptions>
    | IServiceFactoryProvider<IGrpcClientProxyBuilderOptions>;
  metadataRequestBuilder?:
    | IServiceClassProvider<IGrpcMetadataRequestBuilder>
    | IServiceValueProvider<IGrpcMetadataRequestBuilder>
    | IServiceFactoryProvider<IGrpcMetadataRequestBuilder>;
  requestOptions?:
    | IServiceClassProvider<IGrpcRequestOptions>
    | IServiceValueProvider<IGrpcRequestOptions>
    | IServiceFactoryProvider<IGrpcRequestOptions>;
}

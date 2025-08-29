import { Provider } from '@nestjs/common';
import { ImportsType, ServiceClassProvider, ServiceValueProvider, ServiceFactoryProvider } from 'src/modules/common';
import { IGrpcClientProxyBuilderOptions, IGrpcMetadataRequestBuilder, IGrpcRequestOptions } from './types';

export interface IGrpcClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  grpcClientProxyBuilderOptions:
    | ServiceClassProvider<IGrpcClientProxyBuilderOptions>
    | ServiceValueProvider<IGrpcClientProxyBuilderOptions>
    | ServiceFactoryProvider<IGrpcClientProxyBuilderOptions>;
  metadataRequestBuilder?:
    | ServiceClassProvider<IGrpcMetadataRequestBuilder>
    | ServiceValueProvider<IGrpcMetadataRequestBuilder>
    | ServiceFactoryProvider<IGrpcMetadataRequestBuilder>;
  requestOptions?:
    | ServiceClassProvider<IGrpcRequestOptions>
    | ServiceValueProvider<IGrpcRequestOptions>
    | ServiceFactoryProvider<IGrpcRequestOptions>;
}

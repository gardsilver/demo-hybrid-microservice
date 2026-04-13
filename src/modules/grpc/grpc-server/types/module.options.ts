import { Provider } from '@nestjs/common';
import { ImportsType, IServiceClassProvider, IServiceValueProvider, IServiceFactoryProvider } from 'src/modules/common';
import { IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { IGrpcMetadataResponseBuilder } from './types';

export interface IGrpcServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersToAsyncContextAdapter?:
    | IServiceClassProvider<IGrpcHeadersToAsyncContextAdapter>
    | IServiceValueProvider<IGrpcHeadersToAsyncContextAdapter>
    | IServiceFactoryProvider<IGrpcHeadersToAsyncContextAdapter>;
  metadataResponseBuilder?:
    | IServiceClassProvider<IGrpcMetadataResponseBuilder>
    | IServiceValueProvider<IGrpcMetadataResponseBuilder>
    | IServiceFactoryProvider<IGrpcMetadataResponseBuilder>;
}

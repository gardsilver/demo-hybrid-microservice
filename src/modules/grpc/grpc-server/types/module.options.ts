import { Provider } from '@nestjs/common';
import { ImportsType, ServiceClassProvider, ServiceValueProvider, ServiceFactoryProvider } from 'src/modules/common';
import { IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { IGrpcMetadataResponseBuilder } from './types';

export interface IGrpcServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersToAsyncContextAdapter?:
    | ServiceClassProvider<IGrpcHeadersToAsyncContextAdapter>
    | ServiceValueProvider<IGrpcHeadersToAsyncContextAdapter>
    | ServiceFactoryProvider<IGrpcHeadersToAsyncContextAdapter>;
  metadataResponseBuilder?:
    | ServiceClassProvider<IGrpcMetadataResponseBuilder>
    | ServiceValueProvider<IGrpcMetadataResponseBuilder>
    | ServiceFactoryProvider<IGrpcMetadataResponseBuilder>;
}

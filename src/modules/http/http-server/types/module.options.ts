import { Provider } from '@nestjs/common';
import { ImportsType, IServiceClassProvider, IServiceFactoryProvider, IServiceValueProvider } from 'src/modules/common';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { IHttpHeadersResponseBuilder } from './types';

export interface IHttpServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersToAsyncContextAdapter?:
    | IServiceClassProvider<IHttpHeadersToAsyncContextAdapter>
    | IServiceValueProvider<IHttpHeadersToAsyncContextAdapter>
    | IServiceFactoryProvider<IHttpHeadersToAsyncContextAdapter>;
  headersResponseBuilder?:
    | IServiceClassProvider<IHttpHeadersResponseBuilder>
    | IServiceValueProvider<IHttpHeadersResponseBuilder>
    | IServiceFactoryProvider<IHttpHeadersResponseBuilder>;
}

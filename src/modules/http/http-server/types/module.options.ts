import { Provider } from '@nestjs/common';
import { ImportsType, ServiceClassProvider, ServiceFactoryProvider, ServiceValueProvider } from 'src/modules/common';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { IHttpHeadersResponseBuilder } from './types';

export interface IHttpServerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersToAsyncContextAdapter?:
    | ServiceClassProvider<IHttpHeadersToAsyncContextAdapter>
    | ServiceValueProvider<IHttpHeadersToAsyncContextAdapter>
    | ServiceFactoryProvider<IHttpHeadersToAsyncContextAdapter>;
  headersResponseBuilder?:
    | ServiceClassProvider<IHttpHeadersResponseBuilder>
    | ServiceValueProvider<IHttpHeadersResponseBuilder>
    | ServiceFactoryProvider<IHttpHeadersResponseBuilder>;
}

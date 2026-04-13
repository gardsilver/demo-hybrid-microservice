import { Provider } from '@nestjs/common';
import { ImportsType, IServiceClassProvider, IServiceFactoryProvider, IServiceValueProvider } from 'src/modules/common';
import { IHttpHeadersRequestBuilder, IHttpRequest, IHttpRequestOptions } from './types';

export type HttpOptions = Partial<IHttpRequest>;

export interface IHttpClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersRequestBuilder?:
    | IServiceClassProvider<IHttpHeadersRequestBuilder>
    | IServiceValueProvider<IHttpHeadersRequestBuilder>
    | IServiceFactoryProvider<IHttpHeadersRequestBuilder>;
  httpModuleOptions?: {
    imports?: ImportsType;
    providers?: Provider[];
    options:
      | IServiceClassProvider<HttpOptions>
      | IServiceValueProvider<HttpOptions>
      | IServiceFactoryProvider<HttpOptions>;
  };
  requestOptions?:
    | IServiceClassProvider<IHttpRequestOptions>
    | IServiceValueProvider<IHttpRequestOptions>
    | IServiceFactoryProvider<IHttpRequestOptions>;
}

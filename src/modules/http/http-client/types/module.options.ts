import { Provider } from '@nestjs/common';
import { ImportsType, ServiceClassProvider, ServiceFactoryProvider, ServiceValueProvider } from 'src/modules/common';
import { IHttpHeadersRequestBuilder, IHttpRequest, IHttpRequestOptions } from './types';

export type HttpOptions = Partial<IHttpRequest>;

export interface HttpClientModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  headersRequestBuilder?:
    | ServiceClassProvider<IHttpHeadersRequestBuilder>
    | ServiceValueProvider<IHttpHeadersRequestBuilder>
    | ServiceFactoryProvider<IHttpHeadersRequestBuilder>;
  httpModuleOptions?: {
    imports?: ImportsType;
    providers?: Provider[];
    options:
      | ServiceClassProvider<HttpOptions>
      | ServiceValueProvider<HttpOptions>
      | ServiceFactoryProvider<HttpOptions>;
  };
  requestOptions?:
    | ServiceClassProvider<IHttpRequestOptions>
    | ServiceValueProvider<IHttpRequestOptions>
    | ServiceFactoryProvider<IHttpRequestOptions>;
}

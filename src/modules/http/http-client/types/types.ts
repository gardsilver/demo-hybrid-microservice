import { Method, AxiosRequestConfig } from 'axios';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { IHttpHeadersBuilder } from 'src/modules/http/http-common';

export interface IHttpHeadersBuilderOptions {
  useZipkin?: boolean;
  asArray?: boolean;
  authToken?: string;
}

export interface IHttpHeadersRequestBuilder extends IHttpHeadersBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    options?: IHttpHeadersBuilderOptions,
  ): IHeaders;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IHttpRequest<D = any> extends Partial<Omit<AxiosRequestConfig<D>, 'method' | 'headers'>> {
  method: Method;
  headers?: IHeaders;
}

export interface IHttpRequestOptions {
  headersBuilderOptions?: IHttpHeadersBuilderOptions;
  retryOptions?: {
    retry?: boolean;
    timeout?: number;
    delay?: number;
    retryMaxCount?: number;
    statusCodes?: Array<string | number>;
  };
}

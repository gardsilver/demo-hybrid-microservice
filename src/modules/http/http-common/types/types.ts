import { IGeneralAsyncContext, IHeaders, IHeadersToContextAdapter } from 'src/modules/common';

export interface IHttpHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IGeneralAsyncContext> {}

export interface IHttpHeadersBuilderOptions {}

export interface IHttpHeadersBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    options?: IHttpHeadersBuilderOptions,
  ): IHeaders;
}

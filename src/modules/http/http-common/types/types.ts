import { IHeaders, IHeadersToContextAdapter } from 'src/modules/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';

export interface IHttpHeadersToAsyncContextAdapter extends IHeadersToContextAdapter<IGeneralAsyncContext> {}

export interface IHttpHeadersBuilderOptions {}

export interface IHttpHeadersBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; headers?: IHeaders },
    options?: IHttpHeadersBuilderOptions,
  ): IHeaders;
}

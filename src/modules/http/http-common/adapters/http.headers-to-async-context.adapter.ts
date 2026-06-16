import { Injectable } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { IHttpHeadersToAsyncContextAdapter } from '../types/types';
import { HttHeadersHelper } from '../helpers/http.headers.helper';

@Injectable()
export class HttpHeadersToAsyncContextAdapter implements IHttpHeadersToAsyncContextAdapter {
  adapt(headers: IHeaders): IGeneralAsyncContext {
    return HttHeadersHelper.toAsyncContext<IGeneralAsyncContext>(headers);
  }
}

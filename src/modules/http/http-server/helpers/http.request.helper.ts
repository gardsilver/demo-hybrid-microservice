import { Request } from 'express';
import { IAsyncContext } from 'src/modules/async-context';
import { IAuthInfo } from 'src/modules/auth';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from '../types/constants';

export class HttpRequestHelper {
  public static setAuthInfo(authIfo: IAuthInfo, request: Request) {
    request[METADATA_AUTH_INFO_KEY] = authIfo;
  }

  public static getAuthInfo(request: Request): IAuthInfo {
    return request[METADATA_AUTH_INFO_KEY] as undefined as IAuthInfo;
  }

  public static setAsyncContext<Ctx = IAsyncContext>(ctx: Ctx, request: Request) {
    request[METADATA_ASYNC_CONTEXT_KEY] = ctx;
  }

  public static getAsyncContext<Ctx = IAsyncContext>(request: Request): Ctx {
    return request[METADATA_ASYNC_CONTEXT_KEY] as undefined as Ctx;
  }
}

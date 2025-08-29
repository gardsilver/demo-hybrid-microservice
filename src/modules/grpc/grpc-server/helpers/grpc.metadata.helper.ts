import { Metadata } from '@grpc/grpc-js';
import { IAsyncContext } from 'src/modules/async-context';
import { IAuthInfo } from 'src/modules/auth';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from 'src/modules/http/http-server';

export class GrpcMetadataHelper {
  public static setAuthInfo(authIfo: IAuthInfo, metadata: Metadata) {
    metadata[METADATA_AUTH_INFO_KEY] = authIfo;
  }

  public static getAuthInfo(metadata: Metadata): IAuthInfo {
    return metadata[METADATA_AUTH_INFO_KEY] as undefined as IAuthInfo;
  }

  public static setAsyncContext<Ctx = IAsyncContext>(ctx: Ctx, metadata: Metadata) {
    metadata[METADATA_ASYNC_CONTEXT_KEY] = ctx;
  }

  public static getAsyncContext<Ctx = IAsyncContext>(metadata: Metadata): Ctx {
    return metadata[METADATA_ASYNC_CONTEXT_KEY] as undefined as Ctx;
  }
}

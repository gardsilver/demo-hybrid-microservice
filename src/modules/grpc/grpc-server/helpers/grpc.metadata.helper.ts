import { Metadata } from '@grpc/grpc-js';
import { IAsyncContext } from 'src/modules/async-context';
import { IAuthInfo } from 'src/modules/auth';
import { METADATA_ASYNC_CONTEXT_KEY, METADATA_AUTH_INFO_KEY } from 'src/modules/http/http-server';

type MetadataWithExtras = Metadata & Record<string | symbol, unknown>;

export abstract class GrpcMetadataHelper {
  public static setAuthInfo(authIfo: IAuthInfo, metadata: Metadata) {
    (metadata as MetadataWithExtras)[METADATA_AUTH_INFO_KEY] = authIfo;
  }

  public static getAuthInfo(metadata: Metadata): IAuthInfo {
    return (metadata as MetadataWithExtras)[METADATA_AUTH_INFO_KEY] as IAuthInfo;
  }

  public static setAsyncContext<Ctx = IAsyncContext>(ctx: Ctx, metadata: Metadata) {
    (metadata as MetadataWithExtras)[METADATA_ASYNC_CONTEXT_KEY] = ctx;
  }

  public static getAsyncContext<Ctx = IAsyncContext>(metadata: Metadata): Ctx {
    return (metadata as MetadataWithExtras)[METADATA_ASYNC_CONTEXT_KEY] as Ctx;
  }
}

import { ServerOptions } from 'socket.io';
import { Context, Span } from '@opentelemetry/api';
import { IAuthInfo } from 'src/modules/auth';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';

export interface IWsMicroserviceBuilderOptions {
  serverOptions?: Partial<ServerOptions>;
  headersAdapter?: IHttpHeadersToAsyncContextAdapter;
  checkAuthConnect?: boolean;
}

export interface IWsContextTelemetry {
  context: Context;
  span: Span;
  asyncContext: IGeneralAsyncContext;
}

export interface IWsConnectionData {
  telemetry?: IWsContextTelemetry;
  authInfo?: IAuthInfo;
}

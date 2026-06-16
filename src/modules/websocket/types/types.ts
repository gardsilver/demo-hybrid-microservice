import { ServerOptions } from 'socket.io';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';

export interface IWsMicroserviceBuilderOptions {
  serverOptions?: Partial<ServerOptions>;
  headersAdapter?: IHttpHeadersToAsyncContextAdapter;
}

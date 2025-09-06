import { IHeaders } from 'src/modules/common';

export interface IRequest {
  method?: string;
  route?: unknown;
  url?: string;
  path?: string;
  params?: unknown;
  headers?: IHeaders;
  body?: unknown;
}

export class MockRequest implements IRequest {
  public method?: string;
  public route?: unknown;
  public url?: string;
  public path?: string;
  public params?: unknown;
  public headers?: IHeaders;
  public body?: unknown;

  constructor(options?: IRequest) {
    this.method = options?.method;
    this.route = options?.route;
    this.url = options?.url;
    this.path = options?.path;
    this.params = options?.params;
    this.headers = options?.headers ?? {};
    this.body = options?.body;
  }

  public header(name: string): string | string[] {
    return name in this.headers ? this.headers[name] : undefined;
  }
}

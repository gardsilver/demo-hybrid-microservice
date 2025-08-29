import { AxiosResponse } from 'axios';

export interface IHttpClientError<T, D> {
  message: string;
  statusCode: string | number;
  loggerMarker: string;
  cause?: unknown;
  response?: AxiosResponse<T, D>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class HttpClientError<T = any, D = any> extends Error implements IHttpClientError<T, D> {
  protected constructor(
    message: string,
    public readonly statusCode: string | number,
    public readonly loggerMarker: string,
    cause?: unknown,
    public readonly response?: AxiosResponse<T, D>,
  ) {
    super(message === undefined ? 'HTTP Server Unknown Error' : message);
    this.name = 'Http Client Error';

    if (this.statusCode === undefined) {
      this.statusCode = 'UnknownError';
    }

    if (cause) {
      this.cause = cause;
    }
  }
}

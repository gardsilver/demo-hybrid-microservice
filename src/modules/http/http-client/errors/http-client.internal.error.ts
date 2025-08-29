import { AxiosResponse } from 'axios';
import { LoggerMarkers } from 'src/modules/common';
import { HttpClientError } from './http-client.error';

export class HttpClientInternalError<T, D> extends HttpClientError<T, D> {
  constructor(message: string, statusCode: string | number, cause?: unknown, response?: AxiosResponse<T, D>) {
    super(
      message === undefined ? 'Internal HTTP Server Error' : message,
      statusCode,
      LoggerMarkers.INTERNAL,
      cause,
      response,
    );

    this.name = 'Http Client Internal Error';
  }
}

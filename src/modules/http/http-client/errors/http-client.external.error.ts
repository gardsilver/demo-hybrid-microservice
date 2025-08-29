import { AxiosResponse } from 'axios';
import { LoggerMarkers } from 'src/modules/common';
import { HttpClientError } from './http-client.error';

export class HttpClientExternalError<T, D> extends HttpClientError<T, D> {
  constructor(message: string, statusCode: string | number, cause?: unknown, response?: AxiosResponse<T, D>) {
    super(
      message === undefined ? 'External HTTP Server Error' : message,
      statusCode,
      LoggerMarkers.EXTERNAL,
      cause,
      response,
    );

    this.name = 'Http Client External Error';
  }
}

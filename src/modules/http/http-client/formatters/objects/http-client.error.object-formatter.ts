import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { HttpClientError } from '../../errors/http-client.error';

export class HttpClientErrorFormatter extends BaseErrorObjectFormatter<HttpClientError> {
  canFormat(obj: unknown): obj is HttpClientError {
    return obj instanceof HttpClientError;
  }

  transform(from: HttpClientError): IKeyValue<unknown> {
    return {
      statusCode: from.statusCode,
      response: from.response
        ? {
            status: from.response.status,
            statusText: from.response.statusText,
            data: from.response.data,
            headers: from.response.headers ? HttHeadersHelper.normalize(from.response.headers) : undefined,
          }
        : undefined,
    };
  }
}

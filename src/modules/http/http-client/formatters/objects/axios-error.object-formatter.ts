import { AxiosError, isAxiosError } from 'axios';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { HttHeadersHelper } from 'src/modules/http/http-common';

export class AxiosErrorFormatter extends BaseErrorObjectFormatter<AxiosError> {
  canFormat(obj: unknown): obj is AxiosError {
    return isAxiosError(obj);
  }

  transform(from: AxiosError): IKeyValue<unknown> {
    return {
      code: from.code,
      status: from.status,
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

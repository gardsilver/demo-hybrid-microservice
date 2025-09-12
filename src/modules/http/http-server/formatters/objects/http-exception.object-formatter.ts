import { HttpException } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

export class HttpExceptionFormatter extends BaseErrorObjectFormatter<HttpException> {
  canFormat(obj: unknown): obj is HttpException {
    return obj instanceof HttpException;
  }

  transform(from: HttpException): IKeyValue<unknown> {
    return {
      status: from.getStatus(),
      response: from.getResponse(),
    };
  }
}

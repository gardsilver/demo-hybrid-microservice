import { HttpException } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';

export class HttpExceptionFormatter implements IObjectFormatter<HttpException> {
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

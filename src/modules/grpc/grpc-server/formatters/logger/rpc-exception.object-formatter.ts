import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

@Injectable()
export class RpcExceptionFormatter extends BaseErrorObjectFormatter<RpcException> {
  isInstanceOf(obj: unknown): obj is RpcException {
    return obj instanceof RpcException;
  }

  transform(from: RpcException): IKeyValue<unknown> {
    const responseStatus = from.getError();

    if (typeof responseStatus === 'string') {
      return {
        data: responseStatus,
      };
    }

    const format: IKeyValue<unknown> = {
      status: this.unknownFormatter.transform(responseStatus),
    };

    return format;
  }
}

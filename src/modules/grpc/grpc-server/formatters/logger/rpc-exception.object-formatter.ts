import { RpcException } from '@nestjs/microservices';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

export class RpcExceptionFormatter extends BaseErrorObjectFormatter<RpcException> {
  canFormat(obj: unknown): obj is RpcException {
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
      ...responseStatus,
    };

    if ('metadata' in format) {
      format['metadata'] = this.unknownFormatter.transform(format.metadata);
    }

    return format;
  }
}

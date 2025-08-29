import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';

export class RpcExceptionFormatter implements IObjectFormatter<RpcException> {
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
      if (!!format.metadata && format.metadata instanceof Metadata) {
        format['metadata'] = GrpcHeadersHelper.normalize(format.metadata.getMap());
      }
    }

    return format;
  }
}

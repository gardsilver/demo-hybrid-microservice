import { Metadata } from '@grpc/grpc-js';
import { ArgumentsHost } from '@nestjs/common';

export class GrpcHelper {
  public static isGrpc(context: ArgumentsHost): boolean {
    if (context.getType() !== 'rpc') {
      return false;
    }

    return context.switchToRpc().getContext() instanceof Metadata;
  }
}

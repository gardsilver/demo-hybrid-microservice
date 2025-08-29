import { Metadata } from '@grpc/grpc-js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IGeneralAsyncContext } from 'src/modules/common';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';

export const GrpcGeneralAsyncContext = createParamDecorator(
  (data: string, ctx: ExecutionContext): IGeneralAsyncContext => {
    const rpc = ctx.switchToRpc();
    const metadata = rpc.getContext<Metadata>();

    const asyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

    return asyncContext;
  },
);

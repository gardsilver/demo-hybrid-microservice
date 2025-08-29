import { Metadata } from '@grpc/grpc-js';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { IAuthInfo } from 'src/modules/auth';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';

export const GrpcAuthInfo = createParamDecorator((data: string, ctx: ExecutionContext): IAuthInfo => {
  const rpc = ctx.switchToRpc();
  const metadata = rpc.getContext<Metadata>();

  return GrpcMetadataHelper.getAuthInfo(metadata);
});

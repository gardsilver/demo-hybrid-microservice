import { status as GrpcStatus } from '@grpc/grpc-js';

export const GRPC_CLIENT_DEFAULT_OPTIONS = {
  requestOptions: {
    timeout: 15_000,
  },
  retryOptions: {
    timeout: 120_000,
    delay: 5_000,
    retryMaxCount: 5,
    statusCodes: [GrpcStatus.DEADLINE_EXCEEDED, GrpcStatus.UNAVAILABLE, 'timeout'],
  },
};

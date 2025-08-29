import { LoggerMarkers } from 'src/modules/common';
import { GrpcClientError } from './grpc-client.error';

export class GrpcClientTimeoutError extends GrpcClientError {
  constructor(message: string, statusCode: string | number, cause?: unknown) {
    super(
      message === undefined ? 'gRPC Server Timeout Error' : message,
      statusCode === undefined ? 'timeout' : statusCode,
      LoggerMarkers.EXTERNAL,
      cause,
    );
    this.name = 'Grpc Client TimeoutError';
  }
}

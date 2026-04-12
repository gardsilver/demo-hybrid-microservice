import { LoggerMarkers } from 'src/modules/common';
import { GrpcClientError } from './grpc-client.error';

export class GrpcClientInternalError extends GrpcClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(message === undefined ? 'Internal gRPC Server Error' : message, statusCode, LoggerMarkers.INTERNAL, cause);
    this.name = 'Grpc Client Internal Error';
  }
}

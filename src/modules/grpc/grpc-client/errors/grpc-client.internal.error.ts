import { LoggerMarkers } from 'src/modules/common';
import { GrpcClientError } from './grpc-client.error';

export class GrpcClientInternalException extends GrpcClientError {
  constructor(message: string, statusCode: string | number, cause?: unknown) {
    super(message === undefined ? 'Internal gRPC Server Error' : message, statusCode, LoggerMarkers.INTERNAL, cause);
    this.name = 'Grpc Client Internal Exception';
  }
}

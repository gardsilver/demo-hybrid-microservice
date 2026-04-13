import { LoggerMarkers } from 'src/modules/common';
import { GrpcClientError } from './grpc-client.error';

export class GrpcClientExternalError extends GrpcClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(message === undefined ? 'External gRPC Server Error' : message, statusCode, LoggerMarkers.EXTERNAL, cause);
    this.name = 'Grpc Client External Error';
  }
}

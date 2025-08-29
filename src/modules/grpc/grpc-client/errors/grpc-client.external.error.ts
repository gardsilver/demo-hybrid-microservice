import { LoggerMarkers } from 'src/modules/common';
import { GrpcClientError } from './grpc-client.error';

export class GrpcClientExternalException extends GrpcClientError {
  constructor(message: string, statusCode: string | number, cause?: unknown) {
    super(message === undefined ? 'External gRPC Server Error' : message, statusCode, LoggerMarkers.EXTERNAL, cause);
    this.name = 'Grpc Client External Exception';
  }
}

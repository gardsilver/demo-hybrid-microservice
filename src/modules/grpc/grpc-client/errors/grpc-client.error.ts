import { Metadata, ServiceError } from '@grpc/grpc-js';
import { IHeaders } from 'src/modules/common';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';

export const isGrpcServiceError = (error: unknown): error is ServiceError => {
  if (error === undefined || error === null || !(typeof error === 'object' && error instanceof Error)) {
    return false;
  }

  if (!('code' in error) || !('metadata' in error)) {
    return false;
  }

  if (error['code'] === null || error['code'] === undefined || typeof error['code'] !== 'number') {
    return false;
  }

  if (
    error['metadata'] === undefined ||
    !(error['metadata'] === null || (typeof error['metadata'] === 'object' && error['metadata'] instanceof Metadata))
  ) {
    return false;
  }

  if ('details' in error) {
    if (error['details'] === null || !(error['details'] === undefined || typeof error['details'] === 'string')) {
      return false;
    }
  }

  return true;
};

export interface IGrpcClientError {
  message: string;
  loggerMarker: string;
  statusCode: string | number;
  details?: string;
  headers?: IHeaders;
  cause?: unknown;
}

export abstract class GrpcClientError extends Error implements IGrpcClientError {
  public readonly details?: string;
  public readonly headers?: IHeaders;

  protected constructor(
    message: string,
    public readonly statusCode: string | number,
    public readonly loggerMarker: string,
    cause?: unknown,
  ) {
    super(message === undefined ? 'gRPC Server Unknown Error' : message);
    this.name = 'Grpc Client Error';

    if (this.statusCode === undefined) {
      this.statusCode = 'UnknownError';
    }

    if (cause) {
      this.cause = cause;

      if (isGrpcServiceError(cause)) {
        this.details = cause.details;
        if (cause.metadata !== null) {
          this.headers = GrpcHeadersHelper.normalize(cause.metadata.getMap());
        }
      }
    }
  }
}

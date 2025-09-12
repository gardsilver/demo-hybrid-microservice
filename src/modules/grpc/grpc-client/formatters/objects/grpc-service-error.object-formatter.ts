import { ServiceError } from '@grpc/grpc-js';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { isGrpcServiceError } from '../../errors/grpc-client.error';

export class GrpcServiceErrorFormatter extends BaseErrorObjectFormatter<ServiceError> {
  canFormat(obj: unknown): obj is ServiceError {
    return isGrpcServiceError(obj);
  }

  transform(from: ServiceError): IKeyValue<unknown> {
    return {
      code: from.code,
      details: from.details,
      metadata: from.metadata ? GrpcHeadersHelper.normalize(from.metadata.getMap()) : from.metadata,
    };
  }
}

import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { GrpcClientError } from '../../errors/grpc-client.error';

export class GrpcClientErrorFormatter extends BaseErrorObjectFormatter<GrpcClientError> {
  canFormat(obj: unknown): obj is GrpcClientError {
    return obj instanceof GrpcClientError;
  }

  transform(from: GrpcClientError): IKeyValue<unknown> {
    return {
      statusCode: from.statusCode,
      details: from.details,
      headers: from.headers,
    };
  }
}

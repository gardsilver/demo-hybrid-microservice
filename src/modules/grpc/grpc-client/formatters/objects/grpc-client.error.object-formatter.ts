import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';
import { GrpcClientError } from '../../errors/grpc-client.error';

export class GrpcClientErrorFormatter implements IObjectFormatter<GrpcClientError> {
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

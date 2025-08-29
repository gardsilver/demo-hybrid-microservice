import { Metadata } from '@grpc/grpc-js';
import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from '../../helpers/grpc.headers.helper';

export class MetadataObjectFormatter implements IObjectFormatter<Metadata> {
  canFormat(obj: unknown): obj is Metadata {
    return obj instanceof Metadata;
  }

  transform(from: Metadata): IKeyValue<unknown> {
    return GrpcHeadersHelper.normalize(from.getMap());
  }
}

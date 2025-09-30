import { Metadata } from '@grpc/grpc-js';
import { IKeyValue } from 'src/modules/common';
import { ObjectFormatter } from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from '../../helpers/grpc.headers.helper';

export class MetadataObjectFormatter extends ObjectFormatter<Metadata> {
  isInstanceOf(obj: unknown): obj is Metadata {
    return obj instanceof Metadata;
  }

  transform(from: Metadata): IKeyValue<unknown> {
    return GrpcHeadersHelper.normalize(from.getMap());
  }
}

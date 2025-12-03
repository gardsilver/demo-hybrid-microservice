import { Metadata } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseObjectFormatter } from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from '../../helpers/grpc.headers.helper';

@Injectable()
export class MetadataObjectFormatter extends BaseObjectFormatter<Metadata> {
  isInstanceOf(obj: unknown): obj is Metadata {
    return obj instanceof Metadata;
  }

  transform(from: Metadata): IKeyValue<unknown> {
    return GrpcHeadersHelper.normalize(from.getMap());
  }
}

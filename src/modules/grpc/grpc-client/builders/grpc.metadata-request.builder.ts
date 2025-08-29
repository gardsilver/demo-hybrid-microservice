import { Metadata } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from 'src/modules/http/http-common';
import { GrpcMetadataBuilder } from 'src/modules/grpc/grpc-common';
import { IGrpcMetadataBuilderOptions, IGrpcMetadataRequestBuilder } from '../types/types';

@Injectable()
export class GrpcMetadataRequestBuilder extends GrpcMetadataBuilder implements IGrpcMetadataRequestBuilder {
  build(
    params: { asyncContext: IGeneralAsyncContext; metadata?: Metadata },
    options?: IGrpcMetadataBuilderOptions,
  ): Metadata {
    const metadata = super.build(params, options);

    if (options?.authToken !== undefined && options.authToken.length) {
      metadata.set(AUTHORIZATION_HEADER_NAME, `${BEARER_NAME} ${options.authToken}`);
    }

    return metadata;
  }
}

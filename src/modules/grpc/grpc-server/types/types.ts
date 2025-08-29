import { IGrpcMetadataBuilder } from 'src/modules/grpc/grpc-common';

export interface IGrpcMicroserviceBuilderOptions {
  url: string;
  services?: string[];
  package: string | string[];
  baseDir: string;
  protoPath: string | string[];
  includeDirs?: string[];
  normalizeUrl?: boolean;
}

export interface IGrpcMetadataResponseBuilder extends IGrpcMetadataBuilder {}

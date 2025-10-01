import { IGrpcMetadataBuilder } from 'src/modules/grpc/grpc-common';
import { GrpcServerStatusService } from '../services/grpc-server.status.service';

export interface IGrpcMicroserviceBuilderOptions {
  url: string;
  services?: string[];
  package: string | string[];
  baseDir: string;
  protoPath: string | string[];
  includeDirs?: string[];
  normalizeUrl?: boolean;
  statusService: GrpcServerStatusService;
}

export interface IGrpcMetadataResponseBuilder extends IGrpcMetadataBuilder {}

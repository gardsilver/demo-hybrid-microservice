import { Injectable } from '@nestjs/common';
import { GrpcMetadataBuilder } from 'src/modules/grpc/grpc-common';
import { IGrpcMetadataResponseBuilder } from '../types/types';

@Injectable()
export class GrpcMetadataResponseBuilder extends GrpcMetadataBuilder implements IGrpcMetadataResponseBuilder {}

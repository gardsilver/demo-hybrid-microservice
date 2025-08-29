import { Injectable } from '@nestjs/common';
import { HttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { IGrpcHeadersToAsyncContextAdapter } from '../types/types';

@Injectable()
export class GrpcHeadersToAsyncContextAdapter
  extends HttpHeadersToAsyncContextAdapter
  implements IGrpcHeadersToAsyncContextAdapter {}

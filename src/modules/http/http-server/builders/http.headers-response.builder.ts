import { Injectable } from '@nestjs/common';
import { HttpHeadersBuilder } from 'src/modules/http/http-common';
import { IHttpHeadersResponseBuilder } from '../types/types';

@Injectable()
export class HttpHeadersResponseBuilder extends HttpHeadersBuilder implements IHttpHeadersResponseBuilder {}

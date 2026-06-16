import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeaders } from '@nestjs/swagger';
import { IAuthInfo } from 'src/modules/auth';
import { SkipInterceptors } from 'src/modules/common';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import {
  HttpAuthGuard,
  HttpAuthInfo,
  HttpGeneralAsyncContext,
  HttpLogging,
  HttpPrometheus,
} from 'src/modules/http/http-server';
import { SearchResponse } from 'src/examples/integrations/common';
import { GrpcSearchRequest } from '../types/dto';
import { GrpcService } from '../services/grpc.service';
import { TraceSpanHelper } from 'src/modules/elk-logger';

@SkipInterceptors(HttpAuthGuard, HttpLogging, HttpPrometheus)
@Controller('examples/grpc')
@ApiTags('examples')
@ApiBearerAuth()
@ApiHeaders([{ name: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID }])
export class HttpController {
  constructor(private readonly service: GrpcService) {}

  @Post('find')
  async find(
    @Body() request: GrpcSearchRequest,
    @HttpGeneralAsyncContext() context: IGeneralAsyncContext,
    @HttpAuthInfo() authInfo: IAuthInfo,
  ): Promise<SearchResponse> {
    const correlationId = context.correlationId ?? TraceSpanHelper.generateRandomValue();

    return GeneralAsyncContext.instance.runWithContextAsync(
      async () => this.service.search(request, authInfo),
      {
        ...context,
        correlationId,
      },
      'http handler: /api/examples/grpc/find',
    );
  }
}

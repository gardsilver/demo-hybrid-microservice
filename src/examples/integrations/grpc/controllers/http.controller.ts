import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeaders } from '@nestjs/swagger';
import { IAuthInfo } from 'src/modules/auth';
import { GeneralAsyncContext, IGeneralAsyncContext, SkipInterceptors } from 'src/modules/common';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { HttpAuthInfo, HttpGeneralAsyncContext } from 'src/modules/http/http-server';
import { SearchResponse } from 'src/examples/integrations/common';
import { SearchRequest } from '../types/dto';
import { GrpcService } from '../services/grpc.service';

@SkipInterceptors({
  HttpAuthGuard: true,
  HttpLogging: true,
  HttpPrometheus: true,
})
@Controller('examples/grpc')
@ApiTags('examples')
@ApiBearerAuth()
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
export class HttpController {
  constructor(private readonly service: GrpcService) {}

  @Post('find')
  async find(
    @Body() request: SearchRequest,
    @HttpGeneralAsyncContext() context: IGeneralAsyncContext,
    @HttpAuthInfo() authInfo: IAuthInfo,
  ): Promise<SearchResponse> {
    return GeneralAsyncContext.instance.runWithContextAsync(
      async () => this.service.search(request, authInfo),
      context,
    );
  }
}

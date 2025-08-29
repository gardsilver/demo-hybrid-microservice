import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeaders, ApiTags } from '@nestjs/swagger';
import { GeneralAsyncContext, IGeneralAsyncContext, SkipInterceptors } from 'src/modules/common';
import { IAuthInfo } from 'src/modules/auth';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { HttpAuthInfo, HttpGeneralAsyncContext } from 'src/modules/http/http-server';
import { BaseRequest, SearchResponse } from 'src/examples/integrations/common';
import { HttpService } from '../services/http.service';

@SkipInterceptors({
  HttpAuthGuard: true,
  HttpLogging: true,
  HttpPrometheus: true,
})
@Controller('examples/http')
@ApiTags('examples')
@ApiBearerAuth()
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
export class HttpController {
  constructor(private readonly service: HttpService) {}

  @Post('find')
  async find(
    @Body() request: BaseRequest,
    @HttpGeneralAsyncContext() context: IGeneralAsyncContext,
    @HttpAuthInfo() authInfo: IAuthInfo,
  ): Promise<SearchResponse> {
    return GeneralAsyncContext.instance.runWithContextAsync(
      async () => this.service.search(request, authInfo),
      context,
    );
  }
}

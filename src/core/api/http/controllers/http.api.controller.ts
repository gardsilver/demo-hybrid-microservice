import { Controller, Get } from '@nestjs/common';
import { ApiHeaders, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { delay } from 'src/modules/date-timestamp';
import { GracefulShutdownOnCount } from 'src/modules/graceful-shutdown';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { HttpGeneralAsyncContext } from 'src/modules/http/http-server';
import { HttpApiService } from '../services/http-api.service';

@Controller('app')
@ApiTags('app')
@ApiBearerAuth()
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
export class HttpApiController {
  constructor(private readonly service: HttpApiService) {}

  @Get()
  @GracefulShutdownOnCount()
  async getHello(@HttpGeneralAsyncContext() asyncContext: IGeneralAsyncContext): Promise<string> {
    await delay(4_000);

    return GeneralAsyncContext.instance.runWithContextAsync(async () => this.service.getHello(), asyncContext);
  }
}

import { Global, Module } from '@nestjs/common';
import { WsResponseHandler } from './filters/ws.response.handler';
import { WsErrorResponseFilter } from './filters/ws.exceptions.filter';
import { WsAuthGuard } from './guards/ws.auth.guard';

@Global()
@Module({
  providers: [WsErrorResponseFilter, WsResponseHandler, WsAuthGuard],
  exports: [WsErrorResponseFilter, WsAuthGuard],
})
export class WsModule {}

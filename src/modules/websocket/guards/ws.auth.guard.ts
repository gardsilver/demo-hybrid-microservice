import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { AUTH_SERVICE_DI, AuthStatus, IAuthService } from 'src/modules/auth';
import { isSkipped } from 'src/modules/common';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { HttHeadersHelper, HttpAuthHelper } from 'src/modules/http/http-common';
import { WsPacketHelper } from '../helpers/ws.packet.helper';
import { WsHelper } from '../helpers/ws.helper';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!WsHelper.isWs(context)) {
      return true;
    }

    const ctx = context.switchToWs();
    const client = ctx.getClient<Socket>();
    const rawPacket = ctx.getData();

    const parsedPacket = WsPacketHelper.parse(rawPacket);
    const serviceName = context.getClass().name;
    const eventName = parsedPacket.eventName || 'Unknown';
    const operationName = `ws SERVER (WsAuthGuard): ${serviceName}/${eventName}`;

    const headers = HttHeadersHelper.normalize(client.handshake.headers);

    const jwtToken = HttpAuthHelper.token(headers);

    const asyncContext: IGeneralAsyncContext = {
      traceId: GeneralAsyncContext.instance.get('traceId') || '',
      spanId: GeneralAsyncContext.instance.get('spanId') || '',
      parentSpanId: GeneralAsyncContext.instance.get('parentSpanId') || '',
      initialSpanId: GeneralAsyncContext.instance.get('initialSpanId') || '',
      requestId: GeneralAsyncContext.instance.get('requestId'),
      correlationId: GeneralAsyncContext.instance.get('correlationId'),
    };

    const auth = await GeneralAsyncContext.instance.runWithContextAsync(
      async () => {
        return await this.authService.authenticate(jwtToken ?? null);
      },
      asyncContext,
      operationName,
    );

    if (!client.data) {
      client.data = {};
    }
    client.data.authInfo = auth;

    if (isSkipped(context, this.reflector, WsAuthGuard)) {
      return true;
    }

    return auth.status === AuthStatus.SUCCESS;
  }
}

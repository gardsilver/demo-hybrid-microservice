import { applyDecorators, UseGuards } from '@nestjs/common';
import { SubscribeMessage } from '@nestjs/websockets';
import { WsAuthGuard } from '../guards/ws.auth.guard';

export function WsEvent(eventName: string) {
  return applyDecorators(SubscribeMessage(eventName), UseGuards(WsAuthGuard));
}

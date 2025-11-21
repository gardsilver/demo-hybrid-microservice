import { Module } from '@nestjs/common';
import { MainWebSocketGateway } from './services/main.web-socket.gateway';

@Module({
  providers: [MainWebSocketGateway],
})
export class WebSocketApiModule {}

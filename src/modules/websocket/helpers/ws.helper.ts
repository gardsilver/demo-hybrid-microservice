import { ArgumentsHost } from '@nestjs/common';
import { Socket } from 'socket.io';

export abstract class WsHelper {
  public static isWs(context: ArgumentsHost): boolean {
    if (context.getType() !== 'ws') {
      return false;
    }

    try {
      const client = context.switchToWs().getClient<Socket>();
      return client !== null && typeof client === 'object' && typeof client.id === 'string' && 'handshake' in client;
    } catch {
      return false;
    }
  }
}

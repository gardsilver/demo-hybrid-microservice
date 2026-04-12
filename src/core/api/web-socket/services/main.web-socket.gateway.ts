import { Socket } from 'socket.io';
import { SocketId } from 'socket.io-adapter';
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { IGeneralAsyncContext } from 'src/modules/common';
import { HttHeadersHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';

interface IUserSocketData {
  socket: Socket;
  context: IGeneralAsyncContext;
}

enum MessageStatus {
  SUCCESS = 'ok',
  SEND = 'send',
  ERROR = 'error',
}

@WebSocketGateway()
export class MainWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private userMap!: Map<string, Map<SocketId, IUserSocketData>>;
  private clientMap!: Map<SocketId, string>;

  constructor(
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
  ) {}

  afterInit() {
    this.userMap = new Map<string, Map<SocketId, IUserSocketData>>();
    this.clientMap = new Map<SocketId, string>();
  }

  async handleConnection(client: Socket) {
    const headers = HttHeadersHelper.normalize(client.handshake.headers);
    const asyncContext: IGeneralAsyncContext = this.headersAdapter.adapt(headers);

    /**
     * @TODO
     *   Здесь можно проверять разрешено ли подключение через WS.
     *   В нашем примере разрешено для любого пользователя и в заголовке "send-from" указывается от кого будут отправляться сообщения.
     */

    const sendFrom = headers['send-from'];
    const userEmail = typeof sendFrom === 'string' && sendFrom !== '' ? sendFrom : undefined;

    if (!userEmail) {
      client.emit('answerMessage', {
        text: 'Unknown user',
        status: MessageStatus.ERROR,
      });

      client.disconnect(true);
      return;
    }

    if (!this.userMap.has(userEmail)) {
      this.userMap.set(userEmail, new Map<SocketId, IUserSocketData>());
    }

    this.userMap.get(userEmail).set(client.id, {
      socket: client,
      context: asyncContext,
    });

    if (!this.clientMap.has(client.id)) {
      this.clientMap.set(client.id, userEmail);
    }
  }

  handleDisconnect(client: Socket) {
    this.clientMap.delete(client.id);
    this.userMap.forEach((mapClients, userId) => {
      if (mapClients.has(client.id)) {
        mapClients.delete(client.id);
        if (!mapClients.size) {
          this.userMap.delete(userId);
        }
      }
    });
  }

  @SubscribeMessage('askMessage')
  handleMessage(client: Socket, payload: { email: string; text: string }) {
    const senderEmail = this.clientMap.get(client.id);

    let tgt: Map<SocketId, IUserSocketData> | undefined;

    if (this.userMap.has(payload.email)) {
      tgt = this.userMap.get(payload.email);
    }

    const senderSockets = senderEmail ? this.userMap.get(senderEmail) : undefined;

    if (tgt?.size) {
      tgt.forEach((socketData) => {
        socketData.socket.emit('answerMessage', {
          from: senderEmail,
          to: payload.email,
          text: payload.text,
          status: MessageStatus.SUCCESS,
        });
      });
      senderSockets?.forEach((socketData) => {
        socketData.socket.emit('answerMessage', {
          from: senderEmail,
          to: payload.email,
          text: payload.text,
          status: MessageStatus.SEND,
        });
      });
    } else {
      senderSockets?.forEach((socketData) => {
        socketData.socket.emit('answerMessage', {
          from: senderEmail,
          to: payload.email,
          text: payload.text,
          status: MessageStatus.ERROR,
        });
      });
    }
  }
}

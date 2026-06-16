import { Socket } from 'socket.io';
import { SocketId } from 'socket.io-adapter';
import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { HttHeadersHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { LoggerMarkers } from 'src/modules/common';
import { WsConnectionContextHelper, WsEvent } from 'src/modules/websocket';

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
  private logger: IElkLoggerService;

  constructor(
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
  ) {
    this.logger = loggerBuilder.build({
      module: MainWebSocketGateway.name,
      markers: [LoggerMarkers.WS],
    });
  }

  afterInit() {
    this.userMap = new Map<string, Map<SocketId, IUserSocketData>>();
    this.clientMap = new Map<SocketId, string>();
  }

  async handleConnection(client: Socket): Promise<void> {
    return WsConnectionContextHelper.run(client, this.headersAdapter, async () => {
      const headers = HttHeadersHelper.normalize(client.handshake.headers);

      let userEmail =
        typeof headers['send-from'] === 'string' && headers['send-from'] !== '' ? headers['send-from'] : undefined;

      if (!userEmail && typeof client.handshake.query?.['send-from'] === 'string') {
        userEmail = client.handshake.query['send-from'];
      }

      if (!userEmail) {
        this.logger.warn(`[WS Handshake] Connected user token is valid, but 'send-from' parameter is empty.`);
        client.emit('answerMessage', { text: 'Unknown user email', status: MessageStatus.ERROR });
        client.disconnect(true);
        return;
      }

      let userSockets = this.userMap.get(userEmail);
      if (userSockets === undefined) {
        userSockets = new Map<SocketId, IUserSocketData>();
        this.userMap.set(userEmail, userSockets);
      }

      userSockets.set(client.id, { socket: client, context: client.data?.__wsRootContext });
      this.clientMap.set(client.id, userEmail);

      this.logger.info(`[WS Handshake] User [${userEmail}] successfully authorized on socket [${client.id}].`);
    });
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

  @WsEvent('askMessage')
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

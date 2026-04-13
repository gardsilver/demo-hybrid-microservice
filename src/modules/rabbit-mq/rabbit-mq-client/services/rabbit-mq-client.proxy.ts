import {
  connectable,
  defer,
  EmptyError,
  firstValueFrom,
  fromEvent,
  merge,
  Observable,
  ReplaySubject,
  Subject,
  throwError,
} from 'rxjs';
import { first, map, mergeMap, retry, skip, switchMap, take } from 'rxjs/operators';
import { AmqpConnectionManager, ChannelWrapper, Channel } from 'amqp-connection-manager';
import {
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import { InvalidMessageException } from '@nestjs/microservices/errors/invalid-message.exception';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { RmqEvents, RmqEventsMap } from '@nestjs/microservices/events/rmq.events';
import { IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import {
  IRabbitMqProducerMessage,
  IRabbitMqPublishOptions,
  RabbitMqServerBuilder,
  RabbitMqAsyncContext,
  IRabbitMqPublishOptionsBuilder,
  RabbitMqPublishOptionsBuilder,
  IRMQErrorInfo,
  RabbitMqFormatterHelper,
  RabbitMqError,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IRabbitMqClientOptions, IRabbitMqSendOptions } from '../types/types';
import { ProducerSerializer } from '../adapters/producer.serializer';

export class RabbitMqClientProxy {
  private serverName: string;
  private connection$: ReplaySubject<unknown> | undefined;
  private connectionPromise: Promise<void | unknown> | undefined;
  private isInitialConnect = true;
  private client: AmqpConnectionManager | null = null;
  private channel: ChannelWrapper | null = null;
  private pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];
  private serializer!: IProducerSerializer;
  private publishOptionsBuilder!: IRabbitMqPublishOptionsBuilder;
  private options: NonNullable<IRabbitMqClientOptions['producer']> & {
    urls: NonNullable<NonNullable<IRabbitMqClientOptions['producer']>['urls']>;
    queue: string;
    queueOptions: NonNullable<NonNullable<IRabbitMqClientOptions['producer']>['queueOptions']>;
    routing: Array<string>;
    exchangeArguments: NonNullable<NonNullable<IRabbitMqClientOptions['producer']>['exchangeArguments']>;
    exchangeType: NonNullable<NonNullable<IRabbitMqClientOptions['producer']>['exchangeType']>;
    publishOptions: NonNullable<NonNullable<IRabbitMqClientOptions['producer']>['publishOptions']> & {
      headers: NonNullable<IRabbitMqPublishOptions['headers']>;
    };
    publishOptionsBuilderOptions: NonNullable<
      NonNullable<IRabbitMqClientOptions['producer']>['publishOptionsBuilderOptions']
    > & { skip: boolean };
  };

  private logger: IElkLoggerService;

  constructor(
    options: IRabbitMqClientOptions,
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {
    this.logger = this.loggerBuilder.build({ module: RabbitMqClientProxy.name });

    this.serverName = options.serverName;

    const routing = options.producer?.routing ?? [''];

    this.options = {
      ...options.producer,
      urls: options.producer?.urls ?? [RQM_DEFAULT_URL],
      noAssert: options.producer?.noAssert ?? RQM_DEFAULT_NO_ASSERT,
      queue: options.producer?.queue ?? RQM_DEFAULT_QUEUE,
      queueOptions: {
        ...(options.producer?.queueOptions ?? RQM_DEFAULT_QUEUE_OPTIONS),
      },
      routing: Array.isArray(routing) ? routing : [routing],
      exchangeArguments: {
        ...(options.producer?.exchangeArguments ?? {}),
      },
      exchangeType: options.producer?.exchangeType ?? 'topic',
      publishOptions: {
        ...options.producer?.publishOptions,
        persistent: options.producer?.publishOptions?.persistent ?? RQM_DEFAULT_PERSISTENT,
        headers: options.producer?.publishOptions?.headers ?? {},
      },
      publishOptionsBuilderOptions: {
        ...options.producer?.publishOptionsBuilderOptions,
        skip: options.producer?.publishOptionsBuilderOptions?.skip ?? false,
      },
    };

    this.initializeSerializer();
    this.initializeMessagePropertiesBuilder();
  }

  private initializeSerializer(): void {
    this.serializer = this.options.serializer ?? new ProducerSerializer();
  }
  private initializeMessagePropertiesBuilder(): void {
    this.publishOptionsBuilder = this.options.publishOptionsBuilder ?? new RabbitMqPublishOptionsBuilder();
  }

  public getServerName(): string {
    return this.serverName;
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.client) {
      await this.client.close();
    }
    this.channel = null;
    this.client = null;
    this.pendingEventListeners = [];
    this.isInitialConnect = true;
  }

  private connect$(
    instance: AmqpConnectionManager,
    errorEvent = 'error',
    connectEvent = 'connect',
  ): Observable<unknown> {
    const error$ = fromEvent<IRMQErrorInfo | RabbitMqError>(instance, errorEvent).pipe(
      map((errorInfo: IRMQErrorInfo | RabbitMqError) => {
        throw errorInfo instanceof RabbitMqError
          ? errorInfo
          : RabbitMqError.buildFromRMQErrorInfo(this.serverName, errorEvent, errorInfo);
      }),
    );
    const connect$ = fromEvent(instance, connectEvent);

    return merge(error$, connect$).pipe(take(1));
  }

  private mergeDisconnectEvent<T = unknown>(instance: AmqpConnectionManager, source$: Observable<T>): Observable<T> {
    const eventToError = (eventType: string) =>
      fromEvent<IRMQErrorInfo | RabbitMqError>(instance, eventType).pipe(
        map((errorInfo: IRMQErrorInfo | RabbitMqError) => {
          throw errorInfo instanceof RabbitMqError
            ? errorInfo
            : RabbitMqError.buildFromRMQErrorInfo(this.serverName, eventType, errorInfo);
        }),
      );
    const disconnect$ = eventToError(RmqEventsMap.DISCONNECT);

    const urls = (this.options.urls as Array<string | RmqUrl>).map((url: string | RmqUrl) => {
      return JSON.stringify(RabbitMqFormatterHelper.parseUrl(url));
    });

    const connectFailed$ = eventToError('connectFailed').pipe(
      retry({
        delay: (error: RabbitMqError, _retryCount) => {
          if (error.data.url === undefined) {
            return throwError(() => error);
          }

          const search = JSON.stringify(RabbitMqFormatterHelper.parseUrl(error.data.url));

          if (urls.indexOf(search) >= urls.length - 1) {
            return throwError(() => error);
          }

          return new Promise((resolve) => resolve(true));
        },
      }),
    );
    // If we ever decide to propagate all disconnect errors & re-emit them through
    // the "connection" stream then comment out "first()" operator.
    return merge(source$, disconnect$, connectFailed$).pipe(first());
  }

  public connect(): Promise<void | unknown> {
    if (this.client) {
      return this.connectionPromise ?? Promise.resolve();
    }
    this.client = this.createClient();

    this.registerErrorListener(this.client);
    this.registerDisconnectListener(this.client);
    this.registerConnectListener(this.client);
    this.pendingEventListeners.forEach(({ event, callback }) => {
      if (this.client) {
        this.client.on(event, callback);
      }
    });
    this.pendingEventListeners = [];

    const connect$ = this.connect$(this.client);
    const withDisconnect$ = this.mergeDisconnectEvent(this.client, connect$).pipe(
      switchMap(() => this.createChannel()),
    );

    const withReconnect$ = fromEvent(this.client, RmqEventsMap.CONNECT).pipe(skip(1));
    const source$ = merge(withDisconnect$, withReconnect$);

    this.connection$ = new ReplaySubject(1);
    source$.subscribe(this.connection$);
    this.connectionPromise = this.convertConnectionToPromise();

    return this.connectionPromise;
  }

  private async convertConnectionToPromise() {
    if (this.connection$ === undefined) {
      return;
    }
    try {
      return firstValueFrom(this.connection$);
    } catch (err) {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    }
  }

  private createClient(): AmqpConnectionManager {
    return RabbitMqServerBuilder.build({
      urls: this.options.urls,
      socketOptions: this.options.socketOptions,
    });
  }

  private createChannel(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.channel = this.client.createChannel({
          json: false,
          setup: (channel: Channel) => this.setupChannel(channel, resolve),
        });
      }
    });
  }

  private async setupChannel(channel: Channel, resolve: (value: void | PromiseLike<void>) => void) {
    if (!this.options.noAssert && this.options.queue !== RQM_DEFAULT_QUEUE) {
      await channel.assertQueue(this.options.queue, this.options.queueOptions);
    }

    if (this.options.exchange) {
      const exchange = this.options.exchange;

      await channel.assertExchange(exchange, this.options.exchangeType, {
        durable: true,
        arguments: this.options.exchangeArguments,
      });

      if (this.options.queue !== RQM_DEFAULT_QUEUE && this.options.routing.length) {
        const queue = this.options.queue;

        await Promise.all(
          (this.options.routing as Array<string>).map((routingKey) => {
            return channel.bindQueue(queue, exchange, routingKey);
          }),
        );
      }
    }

    resolve();
  }

  private registerErrorListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.ERROR, (errorInfo: IRMQErrorInfo) => {
      this.logger.error('RMQ connection failed.', {
        payload: { error: RabbitMqFormatterHelper.errorInfoFormat(errorInfo) },
      });
    });
  }

  private registerDisconnectListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.DISCONNECT, (errorInfo: IRMQErrorInfo) => {
      if (!this.isInitialConnect) {
        this.connectionPromise = Promise.reject(
          RabbitMqError.buildFromRMQErrorInfo(this.serverName, RmqEventsMap.DISCONNECT, errorInfo),
        );

        // Prevent unhandled promise rejection
        this.connectionPromise.catch(() => {});
      }
      this.logger.warn('RMQ disconnected. Trying to reconnect.', {
        payload: { error: RabbitMqFormatterHelper.errorInfoFormat(errorInfo) },
      });
    });
  }

  private registerConnectListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.CONNECT, () => {
      this.logger.debug('RMQ connection success');

      if (this.isInitialConnect) {
        this.isInitialConnect = false;

        if (!this.channel) {
          this.connectionPromise = this.createChannel();
        }
      } else {
        this.connectionPromise = Promise.resolve();
      }
    });
  }

  public on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.client) {
      this.client.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public send<T = unknown>(
    request: IRabbitMqProducerMessage<T>,
    options?: IRabbitMqSendOptions<T>,
  ): Observable<boolean> {
    if (
      request === undefined ||
      ((request.queue === undefined || request.queue === RQM_DEFAULT_QUEUE) && request.exchange === undefined)
    ) {
      return throwError(() => new InvalidMessageException());
    }

    const source = defer(async () => this.connect()).pipe(mergeMap(async () => this.dispatchMessage(request, options)));
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });

    connectableSource.connect();

    return connectableSource;
  }

  private async dispatchMessage<T = unknown>(
    request: IRabbitMqProducerMessage<T>,
    options?: IRabbitMqSendOptions<T>,
  ): Promise<boolean> {
    const serializer = options?.serializer ?? this.serializer;
    const publishOptionsBuilder = options?.publishOptionsBuilder ?? this.publishOptionsBuilder;

    const serializedPacket = serializer.serialize(request, {
      serverName: this.serverName,
      ...this.options.serializerOption,
      ...options?.serializerOption,
    });

    const publishOptionsBuilderOptions = {
      ...this.options.publishOptionsBuilderOptions,
      ...options?.publishOptionsBuilderOptions,
    };

    let publishOptions: IRabbitMqPublishOptions = {
      ...this.options.publishOptions,
      ...serializedPacket.publishOptions,
      headers: {
        ...this.options.publishOptions.headers,
        ...serializedPacket.publishOptions?.headers,
      },
    };

    if (!publishOptionsBuilderOptions.skip) {
      publishOptions = publishOptionsBuilder.build(
        {
          asyncContext: RabbitMqAsyncContext.instance.extend(),
          publishOptions,
        },
        publishOptionsBuilderOptions,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return new Promise<boolean>((resolve, reject) => {
      const errorCallback = (err: Error | null | undefined, result?: boolean): void => {
        if (err === undefined || err === null) {
          resolve(result ?? false);
        } else {
          reject(
            new RabbitMqError(
              err.message,
              {
                serverName: this.serverName,
                eventType: serializedPacket.exchange ? 'publishFailed' : 'sendToQueueFailed',
              },
              err,
            ),
          );
        }
      };

      if (this.channel === null) {
        reject(
          new RabbitMqError('Channel is not initialized', {
            serverName: this.serverName,
            eventType: serializedPacket.exchange ? 'publishFailed' : 'sendToQueueFailed',
          }),
        );

        return;
      }

      return serializedPacket.exchange
        ? this.channel.publish(
            serializedPacket.exchange,
            serializedPacket.routingKey ?? '',
            serializedPacket.content,
            publishOptions,
            errorCallback,
          )
        : this.channel.sendToQueue(
            serializedPacket.queue ?? RQM_DEFAULT_QUEUE,
            serializedPacket.content,
            publishOptions,
            errorCallback,
          );
    });
  }
}

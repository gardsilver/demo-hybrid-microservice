/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObservable, lastValueFrom } from 'rxjs';
import { AmqpConnectionManager, ChannelWrapper, Channel } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server, TransportId, Transport, MessageHandler, ReadPacket } from '@nestjs/microservices';
import {
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
  RQM_NO_EVENT_HANDLER,
} from '@nestjs/microservices/constants';
import { RmqEvents, RmqEventsMap } from '@nestjs/microservices/events/rmq.events';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import {
  IRabbitMqConsumeMessage,
  RabbitMqAsyncContext,
  RabbitMqServerBuilder,
  IRMQErrorInfo,
  RmqStatus,
  RabbitMqFormatterHelper,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import {
  IConsumerInfo,
  IConsumerDeserializer,
  IEventRabbitMqMessageOptions,
  IRabbitMqMicroserviceBuilderOptions,
  IRabbitMqEventOptions,
  IConsumerPacket,
} from '../types/types';
import { ConsumerDeserializer } from '../adapters/consumer.deserializer';
import {
  RABBIT_MQ_SERVER_CONNECTION_STATUS,
  RABBIT_MQ_HANDLE_MESSAGE,
  RABBIT_MQ_HANDLE_MESSAGE_FAILED,
  RABBIT_MQ_SERVER_CONNECTION_FAILED,
} from '../types/metrics';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context';

const INFINITE_CONNECTION_ATTEMPTS = -1;
const UNKNOWN_EXCEPTION_TYPE = 'UnknownErrorRMQ';

export class RabbitMqServer extends Server<RmqEvents, RmqStatus> {
  public transportId: TransportId = Transport.RMQ;

  protected logger = new Logger(RabbitMqServer.name);
  protected serverName: string;
  protected logTitle: string;
  protected client: AmqpConnectionManager | null = null;
  protected channels: Map<string, ChannelWrapper>;
  protected consumersInfo: Map<string, IConsumerInfo>;

  protected connectionAttempts = 0;
  protected readonly urls: string[] | RmqUrl[];
  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];

  constructor(
    protected readonly options: Required<IRabbitMqMicroserviceBuilderOptions>['consumer'] & {
      serverName: string;
      logTitle?: string;
    },
    protected readonly prometheusManager: PrometheusManager,
  ) {
    super();
    this.channels = new Map<string, ChannelWrapper>();
    this.consumersInfo = new Map<string, IConsumerInfo>();

    this.serverName = this.options.serverName;
    this.logTitle = this.options?.logTitle ?? `RMQ Server [${this.serverName}]: `;
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];

    this.initializeDeserializer(options);
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: IEventRabbitMqMessageOptions,
  ): void {
    if (extras.serverName !== this.serverName || !isEventHandler) {
      return;
    }

    super.addHandler(pattern, callback, isEventHandler, extras);
  }

  public getConsumersInfo(): Map<string, IConsumerInfo> {
    return this.consumersInfo;
  }

  @RabbitMqAsyncContext.define(() => ({
    ...TraceSpanBuilder.build(),
  }))
  public async listen(callback: (err?: unknown, ...optionalParams: unknown[]) => void): Promise<void> {
    try {
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public async close(): Promise<void> {
    if (this.channels.size) {
      const closeAll: Promise<void>[] = [];

      this.channels.forEach((channel) => closeAll.push(channel.close()));

      await Promise.all(closeAll);

      this.channels.clear();
    }

    this.consumersInfo.clear();

    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    this.pendingEventListeners = [];
  }

  protected async start(callback?: (err?: unknown, ...optionalParams: unknown[]) => void) {
    this.logger.log(this.logTitle + 'starting server.');

    this.client = this.createClient();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.client.once(RmqEventsMap.CONNECT, async () => {
      if (this.channels.size) {
        return;
      }

      this.updateStatus(RmqStatus.CONNECTED);

      this.logger.debug(this.logTitle + 'server start process create consumers.');

      try {
        await this.runConsumers();

        this.logger.log(this.logTitle + 'server start success.');

        callback?.();
      } catch (error) {
        this.logger.error(this.logTitle + 'server start failed.', error);

        callback?.(error);
      } finally {
        this.logger.debug(this.logTitle + 'server consumers is created.');
      }
    });

    const maxConnectionAttempts = this.getOptionsProp(
      this.options,
      'maxConnectionAttempts',
      INFINITE_CONNECTION_ATTEMPTS,
    );

    this.registerConnectListener();
    this.registerDisconnectListener();
    this.pendingEventListeners.forEach(({ event, callback }) => this.client?.on(event, callback));
    this.pendingEventListeners = [];

    this.client.once(
      'connectFailed',
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (errorInfo?: IRMQErrorInfo) => {
        if (errorInfo?.err) {
          this.updateStatus(RmqStatus.CRASHED, errorInfo);

          if (maxConnectionAttempts === INFINITE_CONNECTION_ATTEMPTS || this.channels.size) {
            this.logger.warn(this.logTitle + 'connection retry.');

            return;
          }

          if (++this.connectionAttempts >= maxConnectionAttempts) {
            await this.close();

            this.logger.error(this.logTitle + 'server failed.');
            callback?.(errorInfo.err);
          } else {
            this.logger.warn(this.logTitle + 'connection retry.');
          }
        } else {
          this.updateStatus(RmqStatus.DISCONNECTED, errorInfo);
          this.logger.log(this.logTitle + 'disconnected.', RabbitMqFormatterHelper.errorInfoFormat(errorInfo));
          callback?.(new Error('Disconnected from RMQ.'));
        }
      },
    );
  }

  protected createClient(): AmqpConnectionManager {
    return RabbitMqServerBuilder.build({
      urls: this.urls,
      socketOptions: this.getOptionsProp(this.options, 'socketOptions'),
    });
  }

  protected updateStatus(status: RmqStatus, errorInfo?: IRMQErrorInfo): void {
    this._status$.next(status);
    this.logger.debug(this.logTitle + `status[${status}]!`);

    this.prometheusManager.counter().increment(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
      labels: {
        service: this.serverName,
        status: status,
      },
    });

    if (errorInfo?.err) {
      this.prometheusManager.counter().increment(RABBIT_MQ_SERVER_CONNECTION_FAILED, {
        labels: {
          service: this.serverName,
          errorType: errorInfo.err?.name || errorInfo.err?.constructor?.name || UNKNOWN_EXCEPTION_TYPE,
        },
      });
      this.logger.error(this.logTitle + 'connection failed.', RabbitMqFormatterHelper.errorInfoFormat(errorInfo));
    }
  }

  protected registerConnectListener() {
    this.client?.on(RmqEventsMap.CONNECT, () => {
      this.connectionAttempts = 0;
      this.updateStatus(RmqStatus.CONNECTED);
    });
  }

  protected registerDisconnectListener() {
    this.client?.on(RmqEventsMap.DISCONNECT, (errorInfo?: IRMQErrorInfo) => {
      if (errorInfo?.err) {
        this.updateStatus(RmqStatus.CRASHED, errorInfo);
      } else {
        this.updateStatus(RmqStatus.DISCONNECTED, errorInfo);
      }
    });
  }

  protected async runConsumers(): Promise<void> {
    const registeredPatterns = [...this.getHandlers().keys()];

    if (!registeredPatterns.length) {
      this.logger.warn(this.logTitle + 'Have not subscribers. Use decorator @EventRabbitMqMessage for subscribe.');
    }

    registeredPatterns.forEach((pattern) => {
      const handler = this.getHandlers().get(pattern);
      const extras = (handler?.extras ?? {}) as unknown as IEventRabbitMqMessageOptions;

      if (this.client === null) {
        return;
      }

      this.channels.set(
        pattern,
        this.client.createChannel({
          json: false,
          setup: (channel: Channel) => this.setupChannel(pattern, channel, extras),
        }),
      );
    });
  }

  protected parseOptions(extras?: IEventRabbitMqMessageOptions): {
    options: NonNullable<IEventRabbitMqMessageOptions['consumer']>;
    queue: string;
    routing: string[];
    noAssert: boolean;
    noAck: boolean;
    isGlobalPrefetchCount: boolean;
    prefetchCount: number;
    deserializer: IConsumerDeserializer;
  } {
    const options: NonNullable<IEventRabbitMqMessageOptions['consumer']> = {
      ...{
        ...this.options,
        deserializer: undefined,
      },
      ...(extras?.consumer ?? {}),
      queueOptions: {
        ...(this.getOptionsProp(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS),
        ...(extras?.consumer?.queueOptions ?? {}),
      },
      exchangeArguments: {
        ...(this.getOptionsProp(this.options, 'exchangeArguments') || {}),
        ...(extras?.consumer?.exchangeArguments ?? {}),
      },
    };

    const routing = options.routing ?? [''];

    return {
      options,
      queue: this.getOptionsProp(options, 'queue') || RQM_DEFAULT_QUEUE,
      noAssert: this.getOptionsProp(options, 'noAssert', RQM_DEFAULT_NO_ASSERT),
      noAck: this.getOptionsProp(options, 'noAck', RQM_DEFAULT_NOACK),
      isGlobalPrefetchCount: this.getOptionsProp(
        options,
        'isGlobalPrefetchCount',
        RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
      ),
      prefetchCount: this.getOptionsProp(options, 'prefetchCount', RQM_DEFAULT_PREFETCH_COUNT),
      routing: Array.isArray(routing) ? routing : [routing],
      deserializer: extras?.deserializer ?? this.deserializer,
    };
  }

  protected async setupChannel(
    pattern: string,
    channel: Channel,
    extras?: IEventRabbitMqMessageOptions,
  ): Promise<void> {
    const { options, queue, noAssert, noAck, isGlobalPrefetchCount, prefetchCount, routing } =
      this.parseOptions(extras);

    const consumerInfo: IConsumerInfo = {
      queue,
    };

    if (!noAssert) {
      const queueInfo = await channel.assertQueue(queue, options.queueOptions);

      consumerInfo.queue = queueInfo.queue;
    }

    if (options.exchange) {
      const exchange = options.exchange;
      const exchangeType = options.exchangeType ?? 'topic';

      consumerInfo.exchange = exchange;

      await channel.assertExchange(exchange, exchangeType, {
        durable: true,
        arguments: options.exchangeArguments,
      });

      if (routing.length) {
        consumerInfo.routing = routing;
        await Promise.all(
          routing.map((routingKey) => {
            return channel.bindQueue(consumerInfo.queue, exchange, routingKey);
          }),
        );
      }
    }

    this.consumersInfo.set(pattern, consumerInfo);

    await channel.prefetch(prefetchCount, isGlobalPrefetchCount);

    await channel.consume(
      consumerInfo.queue,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (msg) => {
        if (msg === null) {
          return;
        }
        await this.handleMessage(pattern, msg, channel, extras);
      },
      {
        noAck: noAck,
        consumerTag: options.consumerTag,
      },
    );
  }

  @RabbitMqAsyncContext.define(() => ({
    ...TraceSpanBuilder.build(),
  }))
  protected async handleMessage(
    pattern: string,
    messageRef: ConsumeMessage,
    channel: Channel,
    extras?: IEventRabbitMqMessageOptions,
  ): Promise<void> {
    const { options, noAck, routing, deserializer } = this.parseOptions(extras);
    const queue = this.consumersInfo.get(pattern)?.queue ?? RQM_DEFAULT_QUEUE;

    this.prometheusManager.counter().increment(RABBIT_MQ_HANDLE_MESSAGE, {
      labels: {
        service: this.serverName,
        queue,
        exchange: extras?.consumer?.exchange ?? '',
        routing: routing.join(','),
      },
      value: 1,
    });

    let packet: IConsumerPacket | undefined;

    try {
      const messageOptions: IRabbitMqEventOptions & { pattern: string } = {
        serverName: this.serverName,
        pattern,
        consumer: {
          ...options,
          queue,
        },
      };

      packet = await deserializer.deserialize(messageRef, messageOptions);

      if (!packet.data) {
        if (!noAck) {
          channel.ack(messageRef);
        }

        return;
      }

      const rmqContext = new RabbitMqContext([messageRef, packet.data, channel, messageOptions]);

      await this.handleEvent(pattern, packet, rmqContext);
    } catch (error) {
      this.handleErrorInProcessMessage(pattern, messageRef, packet?.data, error as Error, channel, extras);
    }
  }

  private async handleErrorInProcessMessage(
    pattern: string,
    messageRef: ConsumeMessage,
    message: IRabbitMqConsumeMessage | undefined,
    error: Error,
    channel: Channel,
    extras?: IEventRabbitMqMessageOptions,
  ): Promise<void> {
    const { noAck, routing } = this.parseOptions(extras);
    const queue = this.consumersInfo.get(pattern)?.queue ?? RQM_DEFAULT_QUEUE;

    this.logger.error(this.logTitle + `handle ${pattern} failed.`, {
      message: message ?? messageRef,
      error,
    });

    this.prometheusManager.counter().increment(RABBIT_MQ_HANDLE_MESSAGE_FAILED, {
      labels: {
        service: this.serverName,
        queue,
        exchange: extras?.consumer?.exchange ?? '',
        routing: routing.join(','),
        errorType: error.name ?? error.constructor.name,
      },
      value: 1,
    });

    if (!noAck) {
      channel.nack(messageRef, false, false);
    }
  }

  public async handleEvent(pattern: string, packet: ReadPacket, context: RabbitMqContext): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    const extras: IEventRabbitMqMessageOptions = handler?.extras as unknown as IEventRabbitMqMessageOptions;
    const { noAck } = this.parseOptions(extras);

    if (!handler) {
      if (!noAck) {
        context.getChannelRef().nack(context.getMessageRef(), false, false);
      }

      return this.logger.warn(this.logTitle + RQM_NO_EVENT_HANDLER`${pattern}`);
    }

    // eslint-disable-next-line @typescript-eslint/await-thenable
    return await this.onProcessingStartHook(this.transportId, context, async () => {
      try {
        const resultOrStream = await handler(packet.data, context);

        if (isObservable(resultOrStream)) {
          await lastValueFrom(resultOrStream);

          this.onProcessingEndHook?.(this.transportId, context);
        }
      } catch (error) {
        this.handleErrorInProcessMessage(
          pattern,
          context.getMessageRef(),
          context.getMessage(),
          error as Error,
          context.getChannelRef(),
          extras,
        );
      }
    });
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.client as T;
  }

  public on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback): any {
    if (this.client) {
      this.client.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  protected initializeDeserializer(options: IRabbitMqMicroserviceBuilderOptions['consumer']) {
    this.deserializer = options?.deserializer ?? new ConsumerDeserializer();
  }
}

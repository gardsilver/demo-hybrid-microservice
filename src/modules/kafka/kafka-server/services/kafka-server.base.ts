/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kafka as KafkaJs } from 'kafkajs';
import { isObservable, lastValueFrom } from 'rxjs';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  KafkaOptions,
  KafkaStatus,
  MessageHandler,
  Server,
  TransportId,
  Transport,
  KafkaLogger,
  ReadPacket,
} from '@nestjs/microservices';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_EVENT_HANDLER,
} from '@nestjs/microservices/constants';
import {
  Consumer,
  Kafka,
  BrokersFunction,
  KafkaConfig,
  ConsumerConfig,
  KafkaMessage,
} from '@nestjs/microservices/external/kafka.interface';
import { PrometheusManager } from 'src/modules/prometheus';
import {
  IKafkaHeadersToAsyncContextAdapter,
  KafkaHeadersHelper,
  KafkaHeadersToAsyncContextAdapter,
} from 'src/modules/kafka/kafka-common';
import {
  ConsumerMode,
  IConsumerRequestDeserializer,
  IEventKafkaMessageOptions,
  IKafkaMessageOptions,
} from '../types/types';
import { KafkaServerRequestDeserializer } from '../adapters/kafka-server.request.deserializer';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KAFKA_CONNECTION_STATUS } from '../types/metrics';

export abstract class KafkaServerBase extends Server {
  public transportId: TransportId = Transport.KAFKA;

  protected logger = new Logger('KafkaServer');
  protected serverName: string;
  protected client: Kafka | null = null;
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;
  declare protected deserializer: IConsumerRequestDeserializer;
  protected readonly eachMessageHandlers: string[] = [];
  protected readonly batchMessageHandlers: string[] = [];
  protected readonly headerAdapter?: IKafkaHeadersToAsyncContextAdapter;

  constructor(
    protected readonly options: Required<KafkaOptions>['options'] & {
      serverName: string;
      headerAdapter?: IKafkaHeadersToAsyncContextAdapter;
    },
    protected readonly prometheusManager: PrometheusManager,
  ) {
    super();

    const clientOptions = this.getOptionsProp(this.options, 'client', {} as KafkaConfig);
    const consumerOptions = this.getOptionsProp(this.options, 'consumer', {} as ConsumerConfig);
    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-server');

    this.brokers = clientOptions.brokers?.length ? clientOptions.brokers : [KAFKA_DEFAULT_BROKER];
    this.serverName = this.options.serverName;
    this.clientId = (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + postfixId;

    this.deserializer = this.options?.deserializer ?? new KafkaServerRequestDeserializer();
    this.headerAdapter = this.options?.headerAdapter ?? new KafkaHeadersToAsyncContextAdapter();
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method is not supported for Kafka server');
  }

  public addHandler(pattern: any, callback: MessageHandler, isEventHandler = false, extras: Record<string, any>): void {
    if (extras.serverName !== this.serverName || !isEventHandler) {
      return;
    }

    if (extras.mode === undefined) {
      extras.mode = ConsumerMode.EACH_MESSAGE;
    }

    const normalizedPattern = this.normalizePattern(pattern);

    super.addHandler(pattern, callback, isEventHandler, extras);

    if (extras.mode === ConsumerMode.EACH_BATCH) {
      if (this.eachMessageHandlers.includes(normalizedPattern)) {
        throw new Error(
          `Subscription type conflict! The pattern[${normalizedPattern}] cannot be used as eachBach because it is registered as eachMessage.`,
        );
      }

      if (!this.batchMessageHandlers.includes(normalizedPattern)) {
        this.batchMessageHandlers.push(normalizedPattern);
      }
    } else {
      if (this.batchMessageHandlers.includes(normalizedPattern)) {
        throw new Error(
          `Subscription type conflict! The pattern[${normalizedPattern}] cannot be used as eachMessage because it is registered as eachBach.`,
        );
      }

      if (!this.eachMessageHandlers.includes(normalizedPattern)) {
        this.eachMessageHandlers.push(normalizedPattern);
      }
    }
  }

  protected createClient(): Kafka {
    return new KafkaJs(
      Object.assign(
        {
          enforceRequestTimeout: false,
          logCreator: KafkaLogger.bind(null, this.logger),
        },
        this.options.client,
        {
          clientId: this.clientId,
          brokers: this.brokers,
        },
      ) as KafkaConfig,
    );
  }

  protected async createConsumer(): Promise<Consumer> {
    const consumerOptions = Object.assign(this.options.consumer || {}, {
      groupId: this.groupId,
    });
    const consumer = this.client.consumer(consumerOptions);
    this.registerConsumerEventListeners(consumer);

    await consumer.connect();

    return consumer;
  }

  public async listen(callback: (err?: unknown, ...optionalParams: unknown[]) => void): Promise<void> {
    try {
      this.client = this.createClient();
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public abstract close(): Promise<void>;
  protected abstract start(callback: () => void): Promise<void>;

  protected updateStatus(status: KafkaStatus): void {
    this._status$.next(status);
    this.prometheusManager.counter().increment(KAFKA_CONNECTION_STATUS, {
      labels: {
        service: this.serverName,
        status: status,
      },
    });
  }

  protected registerConsumerEventListeners(consumer: Consumer): void {
    consumer.on(consumer.events.CONNECT, () => this.updateStatus(KafkaStatus.CONNECTED));
    consumer.on(consumer.events.DISCONNECT, () => this.updateStatus(KafkaStatus.DISCONNECTED));
    consumer.on(consumer.events.REBALANCING, () => this.updateStatus(KafkaStatus.REBALANCING));
    consumer.on(consumer.events.STOP, () => this.updateStatus(KafkaStatus.STOPPED));
    consumer.on(consumer.events.CRASH, () => this.updateStatus(KafkaStatus.CRASHED));
    consumer.on(consumer.events.GROUP_JOIN, () => this.updateStatus(KafkaStatus.CONNECTED));
  }

  protected abstract bindEachEvents(): Promise<void>;
  protected abstract bindBatchEvents(): Promise<void>;

  public async handleEvent(pattern: string, packet: ReadPacket | ReadPacket[], context: KafkaContext): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      this.logger.error(NO_EVENT_HANDLER`${pattern}`);
      return;
    }

    return this.onProcessingStartHook(this.transportId, context, async () => {
      const resultOrStream = await handler(
        Array.isArray(packet) ? packet.map((val) => val.data) : packet.data,
        context,
      );
      if (isObservable(resultOrStream)) {
        await lastValueFrom(resultOrStream);
        this.onProcessingEndHook?.(this.transportId, context);
      }
    });
  }

  protected getMessageOptionsAndAdapters(
    topic: string,
    kafkaMessage: KafkaMessage,
    handler: MessageHandler | null,
  ): {
    messageOptions: IKafkaMessageOptions;
    adapters: {
      headerAdapter: IKafkaHeadersToAsyncContextAdapter;
      deserializer: IConsumerRequestDeserializer;
    };
  } {
    const eventKafkaMessageOptions = {
      ...handler.extras,
    } as undefined as Record<string, any> & IEventKafkaMessageOptions;

    const headers = KafkaHeadersHelper.normalize(kafkaMessage.headers);
    const headerAdapter = eventKafkaMessageOptions.headerAdapter ?? this.headerAdapter;
    const deserializer = eventKafkaMessageOptions.deserializer ?? this.deserializer;
    const asyncContext = headerAdapter.adapt(headers);

    const correlationId = asyncContext.correlationId;
    const replyPartition = eventKafkaMessageOptions.replyPartition || asyncContext.replyPartition;
    const replyTopic = eventKafkaMessageOptions.replyTopic || asyncContext.replyTopic;

    const messageOptions: IKafkaMessageOptions = {
      ...eventKafkaMessageOptions,
      serverName: this.serverName,
      mode: eventKafkaMessageOptions.mode ?? ConsumerMode.EACH_MESSAGE,
      topic,
      correlationId,
      replyTopic,
      replyPartition,
      headerAdapter: undefined,
      deserializer: undefined,
    };

    return {
      messageOptions,
      adapters: {
        headerAdapter,
        deserializer,
      },
    };
  }
}

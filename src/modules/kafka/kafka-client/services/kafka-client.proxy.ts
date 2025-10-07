import { defer, mergeMap, Observable, Subject, connectable, throwError } from 'rxjs';
import { Kafka as KafkaJs } from 'kafkajs';
import { Logger } from '@nestjs/common/services/logger.service';
import { KafkaLogger } from '@nestjs/microservices';
import { KAFKA_DEFAULT_BROKER, KAFKA_DEFAULT_CLIENT } from '@nestjs/microservices/constants';
import {
  Kafka,
  Producer,
  BrokersFunction,
  KafkaConfig,
  ProducerConfig,
  Message,
  ProducerRecord,
  RecordMetadata,
} from '@nestjs/microservices/external/kafka.interface';
import { InvalidMessageException } from '@nestjs/microservices/errors/invalid-message.exception';
import { IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import {
  KafkaAsyncContext,
  KafkaClientOptionsBuilder,
  KafkaOptionsBuilder,
  KafkaProducerOptionsBuilder,
} from 'src/modules/kafka/kafka-common';
import {
  IKafkaClientServiceOptions,
  IKafkaHeadersRequestBuilder,
  IKafkaRequest,
  IKafkaRequestOptions,
  IProducerPacket,
  IProducerSerializer,
  ProducerMode,
} from '../types/types';
import { KafkaClientHelper } from '../helpers/kafka-client.helper';

export class KafkaClientProxy {
  protected serverName: string;
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  private clientConfig: KafkaConfig;
  private client: Kafka = null;
  private producerConfig: ProducerConfig;
  private producer: Producer = null;
  private sendConfig: Omit<ProducerRecord, 'topic' | 'messages'>;

  constructor(
    options: IKafkaClientServiceOptions,
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly serializer: IProducerSerializer,
    private readonly headerBuilder: IKafkaHeadersRequestBuilder,
  ) {
    this.clientConfig = {
      ...KafkaClientOptionsBuilder.build(options.client, {
        loggerBuilder: this.loggerBuilder,
      }),
      retry: options.client.retry ? KafkaOptionsBuilder.createRetryOptions(options.client.retry) : undefined,
    };

    this.producerConfig = {
      ...KafkaProducerOptionsBuilder.build(options.producer ?? {}),
      retry: options.producer?.retry ? KafkaOptionsBuilder.createRetryOptions(options.producer.retry) : undefined,
    };
    this.sendConfig = { ...options.send };

    this.serverName = options.serverName;
    const postfixId = options.postfixId ?? '-client';
    this.brokers = this.clientConfig.brokers?.length ? this.clientConfig.brokers : [KAFKA_DEFAULT_BROKER];
    this.clientId = (this.clientConfig.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
  }

  public getServerName(): string {
    return this.serverName;
  }

  protected createClient(): Kafka {
    return new KafkaJs(
      Object.assign(
        {
          enforceRequestTimeout: false,
          logCreator: KafkaLogger.bind(null, new Logger('ClientKafka')),
        },
        this.clientConfig,
        {
          clientId: this.clientId,
          brokers: this.brokers,
        },
      ) as KafkaConfig,
    );
  }

  public async close(): Promise<void> {
    await Promise.all([this.producer?.disconnect()]);
    this.producer = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.producer) {
      return this.producer;
    }

    this.client = this.createClient();
    this.producer = this.client.producer(this.producerConfig);
    await this.producer.connect();
  }

  /**
   * Returns an instance of the underlying [server/broker, Producer] instance
   * */
  public unwrap<T = [Kafka, Producer]>(): T {
    if (!this.client) {
      throw new Error('Not initialized. Please call the "connect/send" method before accessing the server.');
    }
    return [this.client, this.producer] as T;
  }

  public send<T = unknown>(request: IKafkaRequest<T>, options?: IKafkaRequestOptions): Observable<RecordMetadata[]> {
    if (!request || !request.topic || !request.data || (Array.isArray(request.data) && !request.data.length)) {
      return throwError(() => new InvalidMessageException());
    }

    const source = defer(async () => this.connect()).pipe(mergeMap(() => this.dispatchMessage(request, options)));
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });

    connectableSource.connect();

    return connectableSource;
  }

  public sendBatch<T = unknown>(
    request: IKafkaRequest<T>[],
    options?: IKafkaRequestOptions,
  ): Observable<RecordMetadata[]> {
    if (!request || !request.length) {
      return throwError(() => new InvalidMessageException());
    }

    for (const req of request) {
      if (!req || !req.topic || !req.data || (Array.isArray(req.data) && !req.data.length)) {
        return throwError(() => new InvalidMessageException());
      }
    }

    const source = defer(async () => this.connect()).pipe(mergeMap(() => this.dispatchBatchMessage(request, options)));
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });

    connectableSource.connect();

    return connectableSource;
  }

  private async dispatchMessage<T = unknown>(
    request: IKafkaRequest<T>,
    options?: IKafkaRequestOptions,
  ): Promise<RecordMetadata[]> {
    const producerRecord = {
      topic: request.topic,
      messages: await this.requestAsMessages(ProducerMode.SEND, request, options),
      ...this.sendConfig,
      ...KafkaClientHelper.buildProducerParams(options),
    };

    return this.producer.send(producerRecord);
  }

  private async dispatchBatchMessage<T = unknown>(
    request: IKafkaRequest<T>[],
    options?: IKafkaRequestOptions,
  ): Promise<RecordMetadata[]> {
    const topicMessages: Promise<Message[]>[] = [];

    for (const req of request) {
      topicMessages.push(this.requestAsMessages(ProducerMode.SEND_BATCH, req, options));
    }

    const producerBatch = {
      ...this.sendConfig,
      ...KafkaClientHelper.buildProducerParams(options),
      topicMessages: (await Promise.all(topicMessages)).map((messages, index) => {
        return {
          topic: request[index].topic,
          messages,
        };
      }),
    };

    return this.producer.sendBatch(producerBatch);
  }

  private async requestAsMessages<T = unknown>(
    mode: ProducerMode,
    request: IKafkaRequest<T>,
    options?: IKafkaRequestOptions,
  ): Promise<Message[]> {
    const messages: Promise<Message>[] = [];

    if (Array.isArray(request.data)) {
      request.data.forEach((data) => {
        messages.push(
          this.buildMessage(
            mode,
            {
              topic: request.topic,
              data,
            },
            options,
          ),
        );
      });
    } else {
      messages.push(
        this.buildMessage(
          mode,
          {
            topic: request.topic,
            data: request.data,
          },
          options,
        ),
      );
    }

    return Promise.all(messages);
  }

  private async buildMessage<T = unknown>(
    mode: ProducerMode,
    packet: IProducerPacket<T>,
    options?: IKafkaRequestOptions,
  ): Promise<Message> {
    const serializer = options?.serializer ?? this.serializer;
    const headerBuilder = options?.headerBuilder ?? this.headerBuilder;

    const message = serializer.serialize(
      {
        ...packet,
        data: {
          ...packet.data,
          headers:
            options?.headersBuilderOptions?.skip === true
              ? packet.data.headers
              : headerBuilder.build(
                  {
                    asyncContext: KafkaAsyncContext.instance.extend(),
                    headers: packet.data.headers,
                  },
                  options?.headersBuilderOptions,
                ),
        },
      },
      {
        ...options?.serializerOption,
        serverName: this.serverName,
        mode,
      },
    );

    return {
      ...message,
      ...KafkaClientHelper.buildMessageParams(options),
    };
  }
}

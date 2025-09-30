import { MessageHandler } from '@nestjs/microservices';
import {
  Consumer,
  ConsumerRunConfig,
  EachBatchPayload,
  EachMessagePayload,
  Kafka,
  KafkaMessage,
} from '@nestjs/microservices/external/kafka.interface';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { KafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { ConsumerMode, IKafkaMessageOptions, KafkaRequest } from '../types/types';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerBase } from './kafka-server.base';
import { KAFKA_HANDLE_MESSAGE_FAILED, KAFKA_HANDLE_MESSAGE_SUCCESS } from '../types/metrics';

export class KafkaServerService extends KafkaServerBase {
  protected consumer: Consumer | null = null;
  protected batchConsumer: Consumer | null = null;

  /**
   * Returns an instance of the underlying [server/broker, each consumer, bath consumer] instance
   *
   * Consumers can be is null if they have no subscribers.
   * */
  public unwrap<T = [Kafka, Consumer, Consumer]>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return [this.client, this.consumer, this.batchConsumer] as T;
  }

  public async listen(callback: (err?: unknown, ...optionalParams: unknown[]) => void): Promise<void> {
    try {
      this.client = this.createClient();
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public async close(): Promise<void> {
    await Promise.all([this.consumer?.disconnect(), this.batchConsumer?.disconnect()]);
    this.consumer = null;
    this.batchConsumer = null;
    this.client = null;
  }

  protected async start(callback: () => void): Promise<void> {
    await Promise.all([this.bindEachEvents(), this.bindBatchEvents()]);

    callback();
  }

  protected async bindEachEvents(): Promise<void> {
    const registeredPatterns = [...this.eachMessageHandlers];

    if (!registeredPatterns.length) {
      this.logger.warn(
        `Have not subscribers on eachMessage for ${this.serverName}. Use decorator EventKafkaMessage for subscribe if you need this process.`,
      );
      return;
    }

    this.consumer = await this.createConsumer();

    const consumerSubscribeOptions = this.options.subscribe || {};

    await this.consumer.subscribe({
      ...consumerSubscribeOptions,
      topics: registeredPatterns,
    });

    const consumerRunOptions = Object.assign(
      {
        autoCommit: true,
        ...(this.options.run || {}),
      },
      {
        eachMessage: async (payload: EachMessagePayload) => this.handleEachMessage(payload),
      },
    ) as undefined as ConsumerRunConfig;

    await this.consumer.run(consumerRunOptions);
  }

  @KafkaAsyncContext.define(() => ({
    ...TraceSpanBuilder.build(),
  }))
  protected async handleEachMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const pattern = payload.topic;

      const handler = this.getHandlerByPattern(pattern);

      const { messageOptions, adapters } = this.getMessageOptionsAndAdapters(pattern, payload.message, handler);
      const packet = await adapters.deserializer.deserialize(payload.message, messageOptions);

      // Skip: не целевое сообщение
      if (packet.data === undefined) {
        this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_SUCCESS, {
          labels: {
            service: this.serverName,
            topics: payload.topic,
            method: ConsumerMode.EACH_MESSAGE,
          },
        });

        return;
      }

      const kafkaContext = new KafkaContext([
        payload.message,
        payload.partition,
        payload.topic,
        this.consumer,
        () => payload.heartbeat(),
        ConsumerMode.EACH_MESSAGE,
        messageOptions,
      ]);

      await this.handleEvent(packet.pattern, packet, kafkaContext);

      this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_SUCCESS, {
        labels: {
          service: this.serverName,
          topics: payload.topic,
          method: ConsumerMode.EACH_MESSAGE,
        },
      });
    } catch (error) {
      this.logger.error(this.serverName + ' filed!', {
        payload,
        error,
      });
      this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_FAILED, {
        labels: {
          service: this.serverName,
          topics: payload.topic,
          method: ConsumerMode.EACH_MESSAGE,
          errorType: error.name ?? error.constructor.name,
        },
      });
    }
  }

  protected async bindBatchEvents(): Promise<void> {
    const registeredPatterns = [...this.batchMessageHandlers];

    if (!registeredPatterns.length) {
      this.logger.warn(
        `Have not subscribers on eachBatch for ${this.serverName}. Use decorator EventKafkaMessage for subscribe if you need this process.`,
      );
      return;
    }

    this.batchConsumer = await this.createConsumer();

    const consumerSubscribeOptions = this.options.subscribe || {};

    await this.batchConsumer.subscribe({
      ...consumerSubscribeOptions,
      topics: registeredPatterns,
    });

    const consumerRunOptions = Object.assign(
      {
        eachBatchAutoResolve: true,
        ...(this.options.run || {}),
      },
      {
        eachBatch: async (payload: EachBatchPayload) => this.handleBatchMessages(payload),
      },
    ) as undefined as ConsumerRunConfig;

    return this.batchConsumer.run(consumerRunOptions);
  }

  @KafkaAsyncContext.define(() => ({
    ...TraceSpanBuilder.build(),
  }))
  protected async handleBatchMessages(payload: EachBatchPayload): Promise<void> {
    try {
      const pattern = payload.batch.topic;

      const handler = this.getHandlerByPattern(pattern);

      let messages = [];

      for (const kafkaMessage of payload.batch.messages) {
        messages.push(this.handleBatchOneMessage(pattern, kafkaMessage, handler));
      }

      messages = (await Promise.all(messages)).filter((options) => options.packet.data);

      // Skip: не целевые сообщения
      if (!messages.length) {
        this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_SUCCESS, {
          labels: {
            service: this.serverName,
            topics: payload.batch.topic,
            method: ConsumerMode.EACH_BATCH,
          },
          value: payload.batch.messages.length,
        });

        return;
      }

      const kafkaContext = new KafkaContext([
        messages.map((options) => options.kafkaMessage),
        payload.batch.partition,
        payload.batch.topic,
        this.batchConsumer,
        () => payload.heartbeat(),
        ConsumerMode.EACH_BATCH,
        messages.map((options) => options.messageOptions),
      ]);

      await this.handleEvent(
        pattern,
        messages.map((options) => options.packet),
        kafkaContext,
      );

      this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_SUCCESS, {
        labels: {
          service: this.serverName,
          topics: payload.batch.topic,
          method: ConsumerMode.EACH_BATCH,
        },
        value: payload.batch.messages.length,
      });
    } catch (error) {
      this.logger.error(ConsumerMode.EACH_BATCH + ' filed!', {
        payload,
        error,
      });
      this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE_FAILED, {
        labels: {
          service: this.serverName,
          topics: payload.batch.topic,
          method: ConsumerMode.EACH_BATCH,
          errorType: error.name ?? error.constructor.name,
        },
        value: payload.batch.messages.length,
      });
    }
  }

  protected async handleBatchOneMessage(
    pattern: string,
    kafkaMessage: KafkaMessage,
    handler: MessageHandler,
  ): Promise<{
    kafkaMessage: KafkaMessage;
    packet: KafkaRequest;
    messageOptions: IKafkaMessageOptions;
  }> {
    const { messageOptions, adapters } = this.getMessageOptionsAndAdapters(pattern, kafkaMessage, handler);
    const packet = await adapters.deserializer.deserialize(kafkaMessage, messageOptions);

    return {
      kafkaMessage,
      packet,
      messageOptions,
    };
  }
}

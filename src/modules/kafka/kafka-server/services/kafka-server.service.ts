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
import { ConsumerMode, IKafkaMessageOptions, IConsumerPacket } from '../types/types';
import { KAFKA_HANDLE_MESSAGE, KAFKA_HANDLE_MESSAGE_FAILED } from '../types/metrics';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerBase } from './kafka-server.base';

export class KafkaServerService extends KafkaServerBase {
  protected consumer: Consumer | null = null;
  protected batchConsumer: Consumer | null = null;

  /**
   * Returns an instance of the underlying [server/broker, each consumer, bath consumer] instance
   *
   * Consumers can be is null if they have no subscribers.
   */
  public unwrap<T = [Kafka, Consumer, Consumer]>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return [this.client, this.consumer, this.batchConsumer] as T;
  }

  public async close(): Promise<void> {
    await super.close();
    await Promise.all([this.consumer?.disconnect(), this.batchConsumer?.disconnect()]);
    this.consumer = null;
    this.batchConsumer = null;
  }

  protected async connect(): Promise<void> {
    await super.connect();

    const eachTopics = [...this.eachMessageHandlers];
    if (eachTopics.length) {
      this.consumer = await this.createConsumer(ConsumerMode.EACH_MESSAGE, eachTopics);
    }

    const batchTopics = [...this.batchMessageHandlers];
    if (batchTopics.length) {
      this.batchConsumer = await this.createConsumer(ConsumerMode.EACH_BATCH, batchTopics);
    }
  }

  protected async start(): Promise<void> {
    await Promise.all([this.bindEachEvents(), this.bindBatchEvents()]);
  }

  protected async bindEachEvents(): Promise<void> {
    const registeredPatterns = [...this.eachMessageHandlers];

    if (!registeredPatterns.length) {
      this.logger.warn(
        this.logTitle +
          `Have not subscribers on ${ConsumerMode.EACH_MESSAGE}. Use decorator EventKafkaMessage for subscribe if you need this process.`,
      );
      return;
    }

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
    this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE, {
      labels: {
        service: this.serverName,
        topics: payload.topic,
        method: ConsumerMode.EACH_MESSAGE,
      },
    });

    try {
      const pattern = payload.topic;

      const handler = this.getHandlerByPattern(pattern);

      const { messageOptions, adapters } = this.getMessageOptionsAndAdapters(pattern, payload.message, handler);
      const packet = await adapters.deserializer.deserialize(payload.message, messageOptions);

      // Skip: не целевое сообщение
      if (packet.data === undefined) {
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
    } catch (error) {
      this.logger.error(this.logTitle + `handle ${ConsumerMode.EACH_MESSAGE} failed.`, {
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
        this.logTitle +
          `Have not subscribers on ${ConsumerMode.EACH_BATCH}. Use decorator EventKafkaMessage for subscribe if you need this process.`,
      );
      return;
    }

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
    this.prometheusManager.counter().increment(KAFKA_HANDLE_MESSAGE, {
      labels: {
        service: this.serverName,
        topics: payload.batch.topic,
        method: ConsumerMode.EACH_BATCH,
      },
      value: payload.batch.messages.length,
    });

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
    } catch (error) {
      this.logger.error(this.logTitle + `handle ${ConsumerMode.EACH_BATCH} failed.`, {
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
    packet: IConsumerPacket;
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

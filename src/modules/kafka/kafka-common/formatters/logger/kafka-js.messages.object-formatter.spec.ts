import { faker } from '@faker-js/faker';
import {
  Batch,
  EachMessagePayload,
  KafkaMessage,
  EachBatchPayload,
} from '@nestjs/microservices/external/kafka.interface';
import { kafkaMessageFactory } from 'tests/modules/kafka';
import {
  isKafkaMessage,
  isEachMessagePayload,
  isBatch,
  isEachBatchPayload,
  KafkaJsMessagesObjectFormatter,
} from './kafka-js.messages.object-formatter';

describe(KafkaJsMessagesObjectFormatter.name, () => {
  let kafkaMessage: KafkaMessage;

  beforeEach(async () => {
    kafkaMessage = kafkaMessageFactory.build(undefined, {
      transient: {
        key: 'key',
        value: 'success',
        headers: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          replyTopic: undefined,
          replyPartition: undefined,
        },
      },
    });
  });

  describe('Type guards', () => {
    it('isKafkaMessage', async () => {
      expect(isKafkaMessage(null)).toBeFalsy();
      expect(isKafkaMessage(undefined)).toBeFalsy();
      expect(isKafkaMessage(faker.string.alpha(2))).toBeFalsy();
      expect(isKafkaMessage(faker.number.int())).toBeFalsy();
      expect(isKafkaMessage(new Error())).toBeFalsy();
      expect(
        isKafkaMessage({
          key: faker.string.alpha(2),
          value: null,
          timestamp: faker.number.int(2),
          attributes: faker.number.int(2),
          offset: faker.number.int(2).toString(),
        }),
      ).toBeFalsy();
      expect(
        isKafkaMessage({
          key: null,
          value: faker.string.alpha(2),
          timestamp: faker.number.int(2),
          attributes: faker.number.int(2),
          offset: faker.number.int(2).toString(),
        }),
      ).toBeFalsy();

      expect(
        isKafkaMessage({
          key: null,
          value: null,
          timestamp: faker.number.int(2),
          attributes: faker.number.int(2),
          offset: faker.number.int(2).toString(),
        }),
      ).toBeFalsy();
      expect(
        isKafkaMessage({
          key: null,
          value: null,
          timestamp: faker.number.int(2).toString(),
          attributes: faker.number.int(2).toString(),
          offset: faker.number.int(2).toString(),
        }),
      ).toBeFalsy();

      expect(
        isKafkaMessage({
          key: null,
          value: null,
          timestamp: faker.number.int(2).toString(),
          attributes: faker.number.int(2),
          offset: faker.number.int(2),
        }),
      ).toBeFalsy();
      expect(
        isKafkaMessage({
          key: null,
          value: null,
          timestamp: faker.number.int(2).toString(),
          attributes: faker.number.int(2),
          offset: faker.number.int(2).toString(),
        }),
      ).toBeTruthy();
      expect(isKafkaMessage(kafkaMessage)).toBeTruthy();
    });

    it('isEachMessagePayload', async () => {
      expect(isEachMessagePayload(null)).toBeFalsy();
      expect(isEachMessagePayload(undefined)).toBeFalsy();
      expect(isEachMessagePayload(faker.string.alpha(2))).toBeFalsy();
      expect(isEachMessagePayload(faker.number.int())).toBeFalsy();
      expect(isEachMessagePayload(new Error())).toBeFalsy();
      expect(
        isEachMessagePayload({
          topic: null,
          partition: faker.string.alpha(2),
          message: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();
      expect(
        isEachMessagePayload({
          topic: faker.string.alpha(2),
          partition: faker.number.int(2).toString(),
          message: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();

      expect(
        isEachMessagePayload({
          topic: faker.string.alpha(2),
          partition: faker.number.int(2),
          message: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();
      expect(
        isEachMessagePayload({
          topic: faker.string.alpha(2),
          partition: faker.number.int(2),
          message: kafkaMessage,
        }),
      ).toBeTruthy();
    });

    it('isBatch', async () => {
      expect(isBatch(null)).toBeFalsy();
      expect(isBatch(undefined)).toBeFalsy();
      expect(isBatch(faker.string.alpha(2))).toBeFalsy();
      expect(isBatch(faker.number.int())).toBeFalsy();
      expect(isBatch(new Error())).toBeFalsy();

      expect(
        isBatch({
          topic: null,
          partition: faker.string.alpha(2),
          highWatermark: faker.string.alpha(2),
          messages: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.string.alpha(2),
          highWatermark: faker.string.alpha(2),
          messages: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.number.int(),
          messages: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: {
            key: faker.string.alpha(2),
          },
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: faker.number.int(),
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [],
        }),
      ).toBeTruthy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [
            {
              key: faker.string.alpha(2),
            },
          ],
        }),
      ).toBeFalsy();

      expect(
        isBatch({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [kafkaMessage],
        }),
      ).toBeTruthy();
    });

    it('isEachBatchPayload', async () => {
      expect(isEachBatchPayload(null)).toBeFalsy();
      expect(isEachBatchPayload(undefined)).toBeFalsy();
      expect(isEachBatchPayload(faker.string.alpha(2))).toBeFalsy();
      expect(isEachBatchPayload(faker.number.int())).toBeFalsy();
      expect(isEachBatchPayload(new Error())).toBeFalsy();

      expect(
        isEachBatchPayload({
          batch: null,
        }),
      ).toBeFalsy();
      expect(
        isEachBatchPayload({
          batch: {
            topic: faker.number.int(),
          },
        }),
      ).toBeFalsy();

      expect(
        isEachBatchPayload({
          batch: {
            topic: faker.string.alpha(2),
            partition: faker.number.int(),
            highWatermark: faker.string.alpha(2),
            messages: [kafkaMessage],
          },
        }),
      ).toBeTruthy();
    });
  });

  describe(KafkaJsMessagesObjectFormatter.name, () => {
    let formatter: KafkaJsMessagesObjectFormatter;

    beforeEach(async () => {
      formatter = new KafkaJsMessagesObjectFormatter();
    });

    it('isInstanceOf', async () => {
      expect(formatter.isInstanceOf(null)).toBeFalsy();
      expect(formatter.isInstanceOf(undefined)).toBeFalsy();
      expect(formatter.isInstanceOf('')).toBeFalsy();
      expect(formatter.isInstanceOf({})).toBeFalsy();
      expect(formatter.isInstanceOf(new Error())).toBeFalsy();
      expect(formatter.isInstanceOf(kafkaMessage)).toBeTruthy();
      expect(
        formatter.isInstanceOf({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [],
        }),
      ).toBeTruthy();
      expect(
        formatter.isInstanceOf({
          topic: faker.string.alpha(2),
          partition: faker.number.int(2),
          message: kafkaMessage,
        }),
      ).toBeTruthy();
      expect(
        formatter.isInstanceOf({
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [kafkaMessage],
        }),
      ).toBeTruthy();
    });

    it('transform KafkaMessage', async () => {
      expect(formatter.transform(kafkaMessage)).toEqual({
        key: 'key',
        value: 'success',
        timestamp: kafkaMessage.timestamp,
        attributes: kafkaMessage.attributes,
        offset: kafkaMessage.offset,
        headers: kafkaMessage.headers,
        size: kafkaMessage.size,
      });
    });

    it('transform Batch', async () => {
      const batch = {
        topic: faker.string.alpha(2),
        partition: faker.number.int(),
        highWatermark: faker.string.alpha(2),
        messages: [kafkaMessage],
      } as Batch;
      expect(formatter.transform(batch)).toEqual({
        ...batch,
        messages: [
          {
            key: 'key',
            value: 'success',
            timestamp: kafkaMessage.timestamp,
            attributes: kafkaMessage.attributes,
            offset: kafkaMessage.offset,
            headers: kafkaMessage.headers,
            size: kafkaMessage.size,
          },
        ],
      });
    });

    it('transform EachMessagePayload', async () => {
      const eachMessagePayload = {
        topic: faker.string.alpha(2),
        partition: faker.number.int(),
        message: kafkaMessage,
      } as EachMessagePayload;
      expect(formatter.transform(eachMessagePayload)).toEqual({
        ...eachMessagePayload,
        message: {
          key: 'key',
          value: 'success',
          timestamp: kafkaMessage.timestamp,
          attributes: kafkaMessage.attributes,
          offset: kafkaMessage.offset,
          headers: kafkaMessage.headers,
          size: kafkaMessage.size,
        },
      });
    });

    it('transform EachBatchPayload', async () => {
      const eachBatchPayload = {
        batch: {
          topic: faker.string.alpha(2),
          partition: faker.number.int(),
          highWatermark: faker.string.alpha(2),
          messages: [kafkaMessage],
        },
      } as EachBatchPayload;
      expect(formatter.transform(eachBatchPayload)).toEqual({
        ...eachBatchPayload,
        batch: {
          ...eachBatchPayload.batch,
          messages: [
            {
              key: 'key',
              value: 'success',
              timestamp: kafkaMessage.timestamp,
              attributes: kafkaMessage.attributes,
              offset: kafkaMessage.offset,
              headers: kafkaMessage.headers,
              size: kafkaMessage.size,
            },
          ],
        },
      });
    });
  });
});

import {
  EachBatchPayload,
  EachMessagePayload,
  KafkaMessage,
  Batch,
} from '@nestjs/microservices/external/kafka.interface';
import { IKeyValue } from 'src/modules/common';
import { ObjectFormatter } from 'src/modules/elk-logger';
import { KafkaHeadersHelper } from '../../helpers/kafka.headers.helper';

export const isKafkaMessage = (obj: unknown): obj is KafkaMessage => {
  if (obj === undefined || obj === null || typeof obj !== 'object') {
    return false;
  }

  if (!('key' in obj) || !(obj['key'] === null || Buffer.isBuffer(obj['key']))) {
    return false;
  }

  if (!('value' in obj) || !(obj['value'] === null || Buffer.isBuffer(obj['value']))) {
    return false;
  }

  if (!('timestamp' in obj) || !(typeof obj['timestamp'] === 'string')) {
    return false;
  }

  if (!('attributes' in obj) || !(typeof obj['attributes'] === 'number')) {
    return false;
  }

  if (!('offset' in obj) || !(typeof obj['offset'] === 'string')) {
    return false;
  }

  return true;
};

export const isEachMessagePayload = (obj: unknown): obj is EachMessagePayload => {
  if (obj === undefined || obj === null || typeof obj !== 'object') {
    return false;
  }

  if (!('topic' in obj) || !(typeof obj['topic'] === 'string')) {
    return false;
  }
  if (!('partition' in obj) || !(typeof obj['partition'] === 'number')) {
    return false;
  }
  if (!('message' in obj) || !isKafkaMessage(obj['message'])) {
    return false;
  }

  return true;
};

export const isBatch = (obj: unknown): obj is Batch => {
  if (obj === undefined || obj === null || typeof obj !== 'object') {
    return false;
  }

  if (!('topic' in obj) || !(typeof obj['topic'] === 'string')) {
    return false;
  }
  if (!('partition' in obj) || !(typeof obj['partition'] === 'number')) {
    return false;
  }

  if (!('highWatermark' in obj) || !(typeof obj['highWatermark'] === 'string')) {
    return false;
  }

  if (!('messages' in obj) || !(typeof obj['messages'] === 'object' && Array.isArray(obj['messages']))) {
    return false;
  }

  if (
    !obj['messages'].reduce((store, mess) => {
      return store && isKafkaMessage(mess);
    }, true)
  ) {
    return false;
  }

  return true;
};

export const isEachBatchPayload = (obj: unknown): obj is EachBatchPayload => {
  if (obj === undefined || obj === null || typeof obj !== 'object') {
    return false;
  }

  if (!('batch' in obj) || !isBatch(obj['batch'])) {
    return false;
  }

  return true;
};

export class KafkaJsMessagesObjectFormatter extends ObjectFormatter<
  EachMessagePayload | EachBatchPayload | KafkaMessage | Batch
> {
  isInstanceOf(obj: unknown): obj is EachMessagePayload | EachBatchPayload | KafkaMessage | Batch {
    return isKafkaMessage(obj) || isBatch(obj) || isEachMessagePayload(obj) || isEachBatchPayload(obj);
  }

  transform(from: EachMessagePayload | EachBatchPayload | KafkaMessage | Batch): IKeyValue<unknown> {
    if (isKafkaMessage(from)) {
      return {
        key: from.key?.toString(),
        value: from.value?.toString(),
        timestamp: from.timestamp,
        attributes: from.attributes,
        offset: from.offset,
        headers: KafkaHeadersHelper.normalize(from.headers ?? from.headers),
        size: from.size,
      };
    }

    if (isEachMessagePayload(from)) {
      return {
        topic: from.topic,
        partition: from.partition,
        message: this.transform(from.message),
      };
    }

    if (isBatch(from)) {
      return {
        topic: from.topic,
        partition: from.partition,
        highWatermark: from.highWatermark,
        messages: from.messages.map((mess) => this.transform(mess)),
      };
    }

    if (isEachBatchPayload(from)) {
      return {
        batch: this.transform(from.batch),
      };
    }
  }
}

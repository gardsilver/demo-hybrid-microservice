import { isPlainObject, isNil } from '@nestjs/common/utils/shared.utils';
import { IKafkaMessage } from 'src/modules/kafka/kafka-common';
import { IProducerPacket, IProducerSerializerOptions, IProducerSerializer } from '../types/types';

export class ProducerSerializer implements IProducerSerializer {
  serialize(
    value: IProducerPacket,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: IProducerSerializerOptions,
  ): IKafkaMessage<string | Buffer> {
    return {
      key: value.data.key ?? null,
      value: this.encode(value.data.value),
      headers: value.data.headers,
    };
  }

  protected encode(value: unknown): Buffer | string | null {
    if (isNil(value)) {
      return null;
    }

    const isObjectOrArray = value && !(typeof value === 'string') && !Buffer.isBuffer(value);

    if (isObjectOrArray) {
      return isPlainObject(value) || Array.isArray(value) ? JSON.stringify(value) : value.toString();
    }

    if (Buffer.isBuffer(value)) {
      return value;
    }

    return value.toString();
  }
}

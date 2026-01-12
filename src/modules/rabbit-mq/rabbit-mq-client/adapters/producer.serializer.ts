import { isPlainObject, isNil } from '@nestjs/common/utils/shared.utils';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IProducerSerializerOptions } from '../types/types';

export class ProducerSerializer<T = unknown> implements IProducerSerializer<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serialize(value: IRabbitMqProducerMessage<T>, options: IProducerSerializerOptions): IRabbitMqProducerMessage<Buffer> {
    return {
      ...value,
      content: this.encode(value.content),
    };
  }

  protected encode(value: unknown): Buffer | null {
    if (isNil(value)) {
      return null;
    }

    if (Buffer.isBuffer(value)) {
      return value;
    }

    const isObjectOrArray = value && !(typeof value === 'string');
    let asString: string;

    if (isObjectOrArray) {
      asString = isPlainObject(value) || Array.isArray(value) ? JSON.stringify(value) : value.toString();
    } else {
      asString = value.toString();
    }

    return Buffer.from(asString);
  }
}

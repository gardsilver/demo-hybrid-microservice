import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { RabbitMqError } from '../../errors/rabbit-mq.error';

@Injectable()
export class RabbitMqErrorObjectFormatter extends BaseErrorObjectFormatter<RabbitMqError> {
  isInstanceOf(obj: unknown): obj is RabbitMqError {
    return obj instanceof RabbitMqError;
  }

  transform(from: RabbitMqError): IKeyValue<unknown> {
    return {
      data: from.data,
    };
  }
}

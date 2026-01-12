import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { RabbitMqClientError } from '../../errors/rabbit-mq-client.error';

@Injectable()
export class RabbitMqClientErrorObjectFormatter extends BaseErrorObjectFormatter<RabbitMqClientError> {
  isInstanceOf(obj: unknown): obj is RabbitMqClientError {
    return obj instanceof RabbitMqClientError;
  }

  transform(from: RabbitMqClientError): IKeyValue<unknown> {
    return {
      statusCode: from.statusCode,
      loggerMarker: from.loggerMarker,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { KafkaClientError } from '../../errors/kafka-client.error';

@Injectable()
export class KafkaClientErrorObjectFormatter extends BaseErrorObjectFormatter<KafkaClientError> {
  isInstanceOf(obj: unknown): obj is KafkaClientError {
    return obj instanceof KafkaClientError;
  }

  transform(from: KafkaClientError): IKeyValue<unknown> {
    return {
      statusCode: from.statusCode,
      loggerMarker: from.loggerMarker,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';
import { IKafkaHeadersToAsyncContextAdapter } from '../types/types';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';
import { KafkaHeadersHelper } from '../helpers/kafka.headers.helper';

@Injectable()
export class KafkaHeadersToAsyncContextAdapter implements IKafkaHeadersToAsyncContextAdapter {
  adapt(headers: IHeaders): IKafkaAsyncContext {
    return KafkaHeadersHelper.toAsyncContext<IKafkaAsyncContext>(headers);
  }
}

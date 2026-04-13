import { IHeaders } from 'src/modules/common';
import { IKafkaAsyncContext, IKafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';

export class MockKafkaHeadersToAsyncContextAdapter implements IKafkaHeadersToAsyncContextAdapter {
  adapt(_headers: IHeaders): IKafkaAsyncContext {
    return {} as unknown as IKafkaAsyncContext;
  }
}

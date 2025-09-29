import { IHeaders } from 'src/modules/common';
import { IKafkaAsyncContext, IKafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';

export class MockKafkaHeadersToAsyncContextAdapter implements IKafkaHeadersToAsyncContextAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  adapt(headers: IHeaders): IKafkaAsyncContext {
    return {} as undefined as IKafkaAsyncContext;
  }
}

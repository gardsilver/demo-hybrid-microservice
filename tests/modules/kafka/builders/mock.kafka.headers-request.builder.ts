import { IHeaders } from 'src/modules/common';
import { IKafkaHeadersRequestBuilder } from 'src/modules/kafka/kafka-client';

export class MockKafkaHeadersRequestBuilder implements IKafkaHeadersRequestBuilder {
  build(): IHeaders {
    return {
      'x-test': 'test',
    };
  }
}

import { MockKafkaHeadersRequestBuilder } from './mock.kafka.headers-request.builder';

describe(MockKafkaHeadersRequestBuilder.name, () => {
  let builder: MockKafkaHeadersRequestBuilder;

  beforeEach(async () => {
    builder = new MockKafkaHeadersRequestBuilder();
  });

  it('default', async () => {
    expect(builder.build()).toEqual({
      'x-test': 'test',
    });
  });
});

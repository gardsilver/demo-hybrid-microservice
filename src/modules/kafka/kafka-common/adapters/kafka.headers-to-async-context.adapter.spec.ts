import { KafkaHeadersHelper } from '../helpers/kafka.headers.helper';
import { KafkaHeadersToAsyncContextAdapter } from './kafka.headers-to-async-context.adapter';

describe(KafkaHeadersToAsyncContextAdapter.name, () => {
  let spyKafkaHeadersHelper: jest.SpyInstance;
  let adapter: KafkaHeadersToAsyncContextAdapter;

  beforeEach(async () => {
    spyKafkaHeadersHelper = jest.spyOn(KafkaHeadersHelper, 'toAsyncContext').mockImplementation(jest.fn());
    adapter = new KafkaHeadersToAsyncContextAdapter();
  });

  it('adapt', async () => {
    adapter.adapt({ status: 'ok' });

    expect(spyKafkaHeadersHelper).toHaveBeenCalledWith({ status: 'ok' });
  });
});

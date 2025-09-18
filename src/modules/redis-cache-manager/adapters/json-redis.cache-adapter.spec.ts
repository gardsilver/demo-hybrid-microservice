import { JsonRedisCacheAdapter } from './json-redis.cache-adapter';

describe(JsonRedisCacheAdapter.name, () => {
  let adapter: JsonRedisCacheAdapter;

  beforeEach(async () => {
    adapter = new JsonRedisCacheAdapter();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('encode', async () => {
    expect(adapter.encode(undefined)).toBeUndefined();

    expect(adapter.encode('[]')).toEqual([]);
  });

  it('decode', async () => {
    expect(adapter.decode([])).toEqual('[]');
  });
});

import { JsonRedisCacheFormatter } from './json-redis.cache-formatter';

describe(JsonRedisCacheFormatter.name, () => {
  let formatter: JsonRedisCacheFormatter;

  beforeEach(async () => {
    formatter = new JsonRedisCacheFormatter();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('encode', async () => {
    expect(formatter.encode(undefined)).toBeUndefined();

    expect(formatter.encode('[]')).toEqual([]);
  });

  it('decode', async () => {
    expect(formatter.decode([])).toEqual('[]');
  });
});

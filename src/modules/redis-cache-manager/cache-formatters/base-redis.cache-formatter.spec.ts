import { BaseRedisCacheFormatter } from './base-redis.cache-formatter';

describe(BaseRedisCacheFormatter.name, () => {
  let formatter: BaseRedisCacheFormatter;

  beforeEach(async () => {
    formatter = new BaseRedisCacheFormatter();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('type', async () => {
    expect(formatter.type()).toBe('any');
  });

  it('encode', async () => {
    expect(formatter.encode(undefined)).toBeUndefined();

    expect(formatter.encode('[]')).toEqual([]);
  });
});

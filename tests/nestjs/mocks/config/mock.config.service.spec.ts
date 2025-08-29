import { MockConfigService } from './mock.config.service';

describe(MockConfigService.name, () => {
  let config: MockConfigService;

  it('get', async () => {
    config = new MockConfigService();
    expect(config.get('any')).toBeUndefined();

    config = new MockConfigService({
      env: 'env',
    });
    expect(config.get('any')).toBeUndefined();
    expect(config.get('env')).toBe('env');
  });

  it('getOrThrow', async () => {
    config = new MockConfigService();
    expect(() => config.getOrThrow('any')).toThrow(new Error('Неизвестный параметр any'));

    config = new MockConfigService({
      env: 'env',
    });
    expect(() => config.getOrThrow('any')).toThrow(new Error('Неизвестный параметр any'));
    expect(config.getOrThrow('env')).toBe('env');
  });
});

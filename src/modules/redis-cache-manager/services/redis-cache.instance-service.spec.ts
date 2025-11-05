import { RedisCacheInstanceService } from './redis-cache.instance-service';
import { RedisCacheService } from './redis-cache.service';

describe(RedisCacheInstanceService.name, () => {
  let cacheService: RedisCacheService;
  let service: RedisCacheInstanceService;

  beforeEach(async () => {
    cacheService = {} as undefined as RedisCacheService;
  });

  it('init', async () => {
    expect(RedisCacheInstanceService.getInstance()).toBeUndefined();

    service = new RedisCacheInstanceService(cacheService);

    expect(service).toBeDefined();
    expect(RedisCacheInstanceService.getInstance()).toBeDefined();
  });
});

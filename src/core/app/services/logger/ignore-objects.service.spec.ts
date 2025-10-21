import { Test } from '@nestjs/testing';
import { IgnoreObjectsService } from './ignore-objects.service';

describe(IgnoreObjectsService.name, () => {
  let service: IgnoreObjectsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [IgnoreObjectsService],
    }).compile();
    service = module.get(IgnoreObjectsService);
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('getCheckObjects', async () => {
    const formatters = service.getCheckObjects();
    expect(formatters).toEqual([]);
  });
});

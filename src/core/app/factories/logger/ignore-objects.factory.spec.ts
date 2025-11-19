import { Test } from '@nestjs/testing';
import { IgnoreObjectsFactory } from './ignore-objects.factory';

describe(IgnoreObjectsFactory.name, () => {
  let service: IgnoreObjectsFactory;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [IgnoreObjectsFactory],
    }).compile();
    service = module.get(IgnoreObjectsFactory);
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('getCheckObjects', async () => {
    const formatters = service.getCheckObjects();
    expect(formatters).toEqual([]);
  });
});

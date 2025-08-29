import { faker } from '@faker-js/faker';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MetadataExplorer } from './metadata-explorer.service';

class TestService {
  public run(): void {}
}

describe(MetadataExplorer.name, () => {
  let testService: TestService;
  let service: MetadataExplorer;
  let discoveryService: DiscoveryService;
  let metadataScanner: MetadataScanner;
  let mockMetadata;

  beforeEach(async () => {
    testService = new TestService();
    mockMetadata = {
      traceId: faker.string.uuid(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: DiscoveryService,
          useValue: {
            getProviders: () => [
              {
                instance: testService,
              },
            ],
            getControllers: () => [
              {
                instance: testService,
              },
            ],
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            getAllMethodNames: () => ['run'],
          },
        },
        MetadataExplorer,
      ],
    }).compile();

    service = module.get(MetadataExplorer);
    discoveryService = module.get(DiscoveryService);
    metadataScanner = module.get(MetadataScanner);
  });

  it('searchAllTargetInstanceMethod', async () => {
    const spyGetProviders = jest.spyOn(discoveryService, 'getProviders');
    const spyGetAllMethodNames = jest.spyOn(metadataScanner, 'getAllMethodNames');
    const spyGetMetadata = jest.spyOn(Reflect, 'getMetadata').mockImplementation(() => mockMetadata);

    expect(service).toBeDefined();

    const results = service.searchAllTargetInstanceMethod('metadataKey');

    expect(spyGetProviders).toHaveBeenCalledTimes(1);
    expect(spyGetAllMethodNames).toHaveBeenCalledWith(testService);
    expect(spyGetMetadata).toHaveBeenCalledWith('metadataKey', testService, 'run');

    expect(results).toEqual([
      {
        instance: testService,
        method: testService['run'],
        metadata: mockMetadata,
      },
      {
        instance: testService,
        method: testService['run'],
        metadata: mockMetadata,
      },
    ]);
  });
});

import { HealthIndicatorService } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { GracefulShutdownHealthIndicatorService } from './graceful-shutdown.health-indicator.service';
import { GracefulShutdownService } from './graceful-shutdown.service';

describe(GracefulShutdownHealthIndicatorService.name, () => {
  const indicator = {
    down: jest.fn(),
    up: jest.fn(),
  };
  let gracefulShutdownService: GracefulShutdownService;
  let gracefulShutdownHealth: GracefulShutdownHealthIndicatorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: HealthIndicatorService,
          useValue: {
            check: () => indicator,
          },
        },
        {
          provide: GracefulShutdownService,
          useValue: {
            isActive: jest.fn(),
          },
        },
        GracefulShutdownHealthIndicatorService,
      ],
    }).compile();

    gracefulShutdownService = module.get(GracefulShutdownService);
    gracefulShutdownHealth = module.get(GracefulShutdownHealthIndicatorService);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(gracefulShutdownHealth).toBeDefined();
  });

  it('up', async () => {
    const spyUp = jest.spyOn(indicator, 'up');
    const spyDown = jest.spyOn(indicator, 'down');

    jest.spyOn(gracefulShutdownService, 'isActive').mockImplementation(() => false);

    await gracefulShutdownHealth.isReadiness();

    expect(spyUp).toHaveBeenCalledTimes(1);
    expect(spyDown).toHaveBeenCalledTimes(0);
  });

  it('down', async () => {
    const spyUp = jest.spyOn(indicator, 'up');
    const spyDown = jest.spyOn(indicator, 'down');

    jest.spyOn(gracefulShutdownService, 'isActive').mockImplementation(() => true);

    await gracefulShutdownHealth.isReadiness();

    expect(spyUp).toHaveBeenCalledTimes(0);
    expect(spyDown).toHaveBeenCalledTimes(1);
  });
});

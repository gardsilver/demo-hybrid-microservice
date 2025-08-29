import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { IAuthService } from '../types/interfaces';
import { AuthHealthIndicatorService } from './auth.health-indicator.service';
import { AUTH_SERVICE_DI } from '../types/tokens';

describe(AuthHealthIndicatorService.name, () => {
  const indicator = {
    down: jest.fn(),
    up: jest.fn(),
  };
  let authService: IAuthService;
  let authHealth: AuthHealthIndicatorService;

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
          provide: AUTH_SERVICE_DI,
          useValue: {
            synchronized: jest.fn(),
          },
        },
        AuthHealthIndicatorService,
      ],
    }).compile();

    authService = module.get(AUTH_SERVICE_DI);
    authHealth = module.get(AuthHealthIndicatorService);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(authHealth).toBeDefined();
  });

  it('up', async () => {
    const spyUp = jest.spyOn(indicator, 'up');
    const spyDown = jest.spyOn(indicator, 'down');

    jest.spyOn(authService, 'synchronized').mockImplementation(() => true);

    await authHealth.isReadiness();

    expect(spyUp).toHaveBeenCalledTimes(1);
    expect(spyDown).toHaveBeenCalledTimes(0);
  });

  it('down', async () => {
    const spyUp = jest.spyOn(indicator, 'up');
    const spyDown = jest.spyOn(indicator, 'down');

    jest.spyOn(authService, 'synchronized').mockImplementation(() => false);

    await authHealth.isReadiness();

    expect(spyUp).toHaveBeenCalledTimes(0);
    expect(spyDown).toHaveBeenCalledTimes(1);
  });
});

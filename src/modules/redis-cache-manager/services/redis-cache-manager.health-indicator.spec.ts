import { HealthIndicatorService } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { REDIS_CACHE_MANAGER_REDIS_CLIENT_DI } from '../types/tokens';
import { RedisCacheManagerHealthIndicator } from './redis-cache-manager.health-indicator';

describe(RedisCacheManagerHealthIndicator.name, () => {
  const indicator = {
    up: jest.fn((details?: unknown) => ({ Redis: { status: 'up', ...(details as object) } })),
    down: jest.fn((details?: unknown) => ({ Redis: { status: 'down', ...(details as object) } })),
  };
  const logger: IElkLoggerService = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    addDefaultLogFields: jest.fn(),
    getLastLogRecord: jest.fn(),
  } as unknown as IElkLoggerService;
  const loggerBuilder: IElkLoggerServiceBuilder = {
    build: jest.fn(() => logger),
  };

  const redisClient = {
    isOpen: false,
    isReady: false,
    ping: jest.fn(),
  };

  let healthIndicator: RedisCacheManagerHealthIndicator;

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
          provide: REDIS_CACHE_MANAGER_REDIS_CLIENT_DI,
          useValue: redisClient,
        },
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: loggerBuilder,
        },
        RedisCacheManagerHealthIndicator,
      ],
    }).compile();

    healthIndicator = module.get(RedisCacheManagerHealthIndicator);

    jest.clearAllMocks();
    redisClient.isOpen = false;
    redisClient.isReady = false;
  });

  it('init', () => {
    expect(healthIndicator).toBeDefined();
  });

  describe('available', () => {
    beforeEach(() => {
      redisClient.isOpen = true;
      redisClient.isReady = true;
      redisClient.ping.mockResolvedValue('PONG');
    });

    it('returns up without logging', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyDown = jest.spyOn(indicator, 'down');
      const spyError = jest.spyOn(logger, 'error');
      const spyWarn = jest.spyOn(logger, 'warn');

      const result = await healthIndicator.isHealthy();

      expect(spyUp).toHaveBeenCalledTimes(1);
      expect(spyUp).toHaveBeenCalledWith({
        isOpen: true,
        isReady: true,
        ping: 'PONG',
      });
      expect(spyDown).not.toHaveBeenCalled();
      expect(spyError).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
      expect(result).toEqual({ Redis: { status: 'up', isOpen: true, isReady: true, ping: 'PONG' } });
    });

    it('ignores unavailableStatus when client is reachable', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyDown = jest.spyOn(indicator, 'down');
      const spyWarn = jest.spyOn(logger, 'warn');
      const spyError = jest.spyOn(logger, 'error');

      await healthIndicator.isHealthy({ unavailableStatus: 'up' });

      expect(spyUp).toHaveBeenCalledTimes(1);
      expect(spyDown).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
      expect(spyError).not.toHaveBeenCalled();
    });
  });

  describe('unavailable — client not ready', () => {
    beforeEach(() => {
      redisClient.isOpen = false;
      redisClient.isReady = false;
    });

    it('defaults to up without logging (reconnect-strategy handles logs)', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyDown = jest.spyOn(indicator, 'down');
      const spyError = jest.spyOn(logger, 'error');
      const spyWarn = jest.spyOn(logger, 'warn');
      const spyPing = jest.spyOn(redisClient, 'ping');

      await healthIndicator.isHealthy();

      expect(spyPing).not.toHaveBeenCalled();
      expect(spyUp).toHaveBeenCalledTimes(1);
      expect(spyUp).toHaveBeenCalledWith({
        isOpen: false,
        isReady: false,
        ping: 'skipped',
      });
      expect(spyDown).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
      expect(spyError).not.toHaveBeenCalled();
    });

    it('returns down without logging when unavailableStatus=down', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyDown = jest.spyOn(indicator, 'down');
      const spyError = jest.spyOn(logger, 'error');
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy({ unavailableStatus: 'down' });

      expect(spyDown).toHaveBeenCalledTimes(1);
      expect(spyDown).toHaveBeenCalledWith({
        isOpen: false,
        isReady: false,
        ping: 'skipped',
      });
      expect(spyUp).not.toHaveBeenCalled();
      expect(spyError).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
    });
  });

  describe('unavailable — ping fails', () => {
    const pingError = new Error('Connection closed');

    beforeEach(() => {
      redisClient.isOpen = true;
      redisClient.isReady = true;
      redisClient.ping.mockRejectedValue(pingError);
    });

    it('defaults to up AND logs warning with exception payload', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyWarn = jest.spyOn(logger, 'warn');
      const spyPing = jest.spyOn(redisClient, 'ping');

      await healthIndicator.isHealthy();

      expect(spyPing).toHaveBeenCalledTimes(1);
      expect(spyUp).toHaveBeenCalledWith({
        isOpen: true,
        isReady: true,
        ping: 'Connection closed',
      });
      expect(spyWarn).toHaveBeenCalledTimes(1);
      expect(spyWarn).toHaveBeenCalledWith(
        'Redis is unavailable — probe reports up due to unavailableStatus option',
        expect.objectContaining({
          payload: expect.objectContaining({
            isOpen: true,
            isReady: true,
            ping: 'Connection closed',
            exception: pingError,
          }),
        }),
      );
    });

    it('returns down without logging when unavailableStatus=down', async () => {
      const spyDown = jest.spyOn(indicator, 'down');
      const spyError = jest.spyOn(logger, 'error');
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy({ unavailableStatus: 'down' });

      expect(spyDown).toHaveBeenCalledWith({
        isOpen: true,
        isReady: true,
        ping: 'Connection closed',
      });
      expect(spyError).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
    });
  });

  describe('unavailable — unexpected ping reply', () => {
    beforeEach(() => {
      redisClient.isOpen = true;
      redisClient.isReady = true;
      redisClient.ping.mockResolvedValue('UNEXPECTED');
    });

    it('treats non-PONG reply as unavailable and surfaces reply in details', async () => {
      const spyUp = jest.spyOn(indicator, 'up');
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy();

      expect(spyUp).toHaveBeenCalledWith({
        isOpen: true,
        isReady: true,
        ping: 'UNEXPECTED',
      });
      expect(spyWarn).toHaveBeenCalledTimes(1);
    });
  });
});

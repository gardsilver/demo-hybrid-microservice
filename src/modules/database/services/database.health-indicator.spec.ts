import { Test } from '@nestjs/testing';
import { HealthIndicatorService, SequelizeHealthIndicator } from '@nestjs/terminus';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { mockSequelize } from 'tests/sequelize-typescript';
import { DatabaseHealthIndicator, DATABASE_HEALTH_INDICATOR_KEY } from './database.health-indicator';
import { DatabaseMigrationStatusService } from './database-migration-status.service';
import { DATABASE_DI } from '../types/tokens';

describe(DatabaseHealthIndicator.name, () => {
  const indicator = {
    up: jest.fn((details?: unknown) => ({
      [DATABASE_HEALTH_INDICATOR_KEY]: { status: 'up', ...(details as object) },
    })),
    down: jest.fn((details?: unknown) => ({
      [DATABASE_HEALTH_INDICATOR_KEY]: { status: 'down', ...(details as object) },
    })),
  };

  const sequelizeHealth = {
    pingCheck: jest.fn(),
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

  let migrationStatus: DatabaseMigrationStatusService;
  let healthIndicator: DatabaseHealthIndicator;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: DATABASE_DI, useValue: mockSequelize },
        { provide: SequelizeHealthIndicator, useValue: sequelizeHealth },
        { provide: HealthIndicatorService, useValue: { check: () => indicator } },
        { provide: ELK_LOGGER_SERVICE_BUILDER_DI, useValue: loggerBuilder },
        DatabaseMigrationStatusService,
        DatabaseHealthIndicator,
      ],
    }).compile();

    migrationStatus = module.get(DatabaseMigrationStatusService);
    healthIndicator = module.get(DatabaseHealthIndicator);

    jest.clearAllMocks();
    sequelizeHealth.pingCheck.mockResolvedValue({ DataBase: { status: 'up' } });
  });

  it('up when ping succeeds and migrations healthy', async () => {
    const spyWarn = jest.spyOn(logger, 'warn');

    await healthIndicator.isHealthy();

    expect(sequelizeHealth.pingCheck).toHaveBeenCalledWith(DATABASE_HEALTH_INDICATOR_KEY, {
      connection: mockSequelize,
      timeout: 10_000,
    });
    expect(indicator.up).toHaveBeenCalledWith({ ping: 'ok', migration: 'ok' });
    expect(indicator.down).not.toHaveBeenCalled();
    expect(spyWarn).not.toHaveBeenCalled();
  });

  it('respects custom timeout', async () => {
    await healthIndicator.isHealthy({ timeout: 500 });

    expect(sequelizeHealth.pingCheck).toHaveBeenCalledWith(DATABASE_HEALTH_INDICATOR_KEY, {
      connection: mockSequelize,
      timeout: 500,
    });
  });

  describe('ping fails', () => {
    const pingError = new Error('connection refused');

    beforeEach(() => {
      sequelizeHealth.pingCheck.mockRejectedValue(pingError);
    });

    it('returns down with ping error in details (migration healthy) and no warn', async () => {
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy();

      expect(indicator.down).toHaveBeenCalledWith({ ping: 'connection refused', migration: 'ok' });
      expect(indicator.up).not.toHaveBeenCalled();
      // Ping-failure сам по себе warning-лог не пишет: probe красный и так.
      expect(spyWarn).not.toHaveBeenCalled();
    });

    it('ping failure always wins — migrationFailedStatus=up does not override it (and no warn)', async () => {
      const spyWarn = jest.spyOn(logger, 'warn');
      migrationStatus.markFailure(new Error('migration broken'), 'm.js');

      await healthIndicator.isHealthy({ migrationFailedStatus: 'up' });

      expect(indicator.down).toHaveBeenCalledWith({
        ping: 'connection refused',
        migration: { error: 'migration broken', failedMigration: 'm.js' },
      });
      expect(indicator.up).not.toHaveBeenCalled();
      // Ping-failure путь не достигает ветки с warn-логом.
      expect(spyWarn).not.toHaveBeenCalled();
    });
  });

  describe('migration failed (ping ok)', () => {
    const migrationError = new Error('syntax error near "CRAETE"');

    beforeEach(() => {
      migrationStatus.markFailure(migrationError, '20260301-broken.js');
    });

    it('defaults to down with migration details (no warn — probe is red)', async () => {
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy();

      expect(indicator.down).toHaveBeenCalledWith({
        ping: 'ok',
        migration: { error: 'syntax error near "CRAETE"', failedMigration: '20260301-broken.js' },
      });
      expect(indicator.up).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
    });

    it('returns up AND logs warning when migrationFailedStatus=up', async () => {
      const spyWarn = jest.spyOn(logger, 'warn');
      const spyError = jest.spyOn(logger, 'error');

      await healthIndicator.isHealthy({ migrationFailedStatus: 'up' });

      expect(indicator.up).toHaveBeenCalledWith({
        ping: 'ok',
        migration: { error: 'syntax error near "CRAETE"', failedMigration: '20260301-broken.js' },
      });
      expect(indicator.down).not.toHaveBeenCalled();
      expect(spyWarn).toHaveBeenCalledTimes(1);
      expect(spyWarn).toHaveBeenCalledWith(
        'Database migrations failed — probe reports up due to migrationFailedStatus option',
        expect.objectContaining({
          payload: expect.objectContaining({
            migration: { error: 'syntax error near "CRAETE"', failedMigration: '20260301-broken.js' },
            exception: migrationError,
          }),
        }),
      );
      expect(spyError).not.toHaveBeenCalled();
    });

    it('returns down when migrationFailedStatus=down (explicit, no warn)', async () => {
      const spyWarn = jest.spyOn(logger, 'warn');

      await healthIndicator.isHealthy({ migrationFailedStatus: 'down' });

      expect(indicator.down).toHaveBeenCalledTimes(1);
      expect(indicator.up).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
    });
  });

  it('migration failure without migration name shows undefined in details', async () => {
    migrationStatus.markFailure(new Error('unsupported dialect'));

    await healthIndicator.isHealthy();

    expect(indicator.down).toHaveBeenCalledWith({
      ping: 'ok',
      migration: { error: 'unsupported dialect', failedMigration: undefined },
    });
  });
});

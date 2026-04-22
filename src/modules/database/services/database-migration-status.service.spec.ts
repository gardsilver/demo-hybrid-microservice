import { DatabaseMigrationStatusService } from './database-migration-status.service';

describe(DatabaseMigrationStatusService.name, () => {
  let service: DatabaseMigrationStatusService;

  beforeEach(() => {
    service = new DatabaseMigrationStatusService();
  });

  it('initial state is healthy', () => {
    expect(service.isHealthy()).toBe(true);
    expect(service.getError()).toBeUndefined();
    expect(service.getFailedMigration()).toBeUndefined();
  });

  it('markFailure stores error and migration name', () => {
    const error = new Error('boom');
    service.markFailure(error, '20260101-foo.js');

    expect(service.isHealthy()).toBe(false);
    expect(service.getError()).toBe(error);
    expect(service.getFailedMigration()).toBe('20260101-foo.js');
  });

  it('markSuccess after failure resets state', () => {
    service.markFailure(new Error('boom'), 'x');
    service.markSuccess();

    expect(service.isHealthy()).toBe(true);
    expect(service.getError()).toBeUndefined();
    expect(service.getFailedMigration()).toBeUndefined();
  });

  it('markFailure without migration name keeps failedMigration undefined', () => {
    service.markFailure(new Error('boom'));

    expect(service.isHealthy()).toBe(false);
    expect(service.getFailedMigration()).toBeUndefined();
  });
});

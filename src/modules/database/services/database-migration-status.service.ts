import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseMigrationStatusService {
  private error: Error | undefined;
  private failedMigration: string | undefined;

  public markSuccess(): void {
    this.error = undefined;
    this.failedMigration = undefined;
  }

  public markFailure(error: Error, failedMigration?: string): void {
    this.error = error;
    this.failedMigration = failedMigration;
  }

  public isHealthy(): boolean {
    return this.error === undefined;
  }

  public getError(): Error | undefined {
    return this.error;
  }

  public getFailedMigration(): string | undefined {
    return this.failedMigration;
  }
}

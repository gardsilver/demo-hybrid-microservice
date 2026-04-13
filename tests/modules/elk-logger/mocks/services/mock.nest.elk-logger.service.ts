import { ILogRecord, INestElkLoggerService } from 'src/modules/elk-logger';

export class MockNestElkLoggerService implements INestElkLoggerService {
  getLastLogRecord(): ILogRecord | undefined {
    return undefined;
  }
  setLogLevels() {}
  log(): void {}
  trace(): void {}
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  fatal(): void {}
}

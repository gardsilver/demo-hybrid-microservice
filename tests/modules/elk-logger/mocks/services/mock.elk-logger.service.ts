import { IElkLoggerService, ILogRecord } from 'src/modules/elk-logger';

export class MockElkLoggerService implements IElkLoggerService {
  getLastLogRecord(): ILogRecord {
    return undefined;
  }
  addDefaultLogFields(): IElkLoggerService {
    return this;
  }
  log(): void {}
  trace(): void {}
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  fatal(): void {}
}

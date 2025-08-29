import { Injectable } from '@nestjs/common';
import {
  GracefulShutdownEvents,
  GracefulShutdownOnEvent,
  GracefulShutdownOnCount,
} from 'src/modules/graceful-shutdown';
import { delay, promisesTimeout } from 'src/modules/date-timestamp';

@Injectable()
export class TestShutdownService {
  @GracefulShutdownOnEvent({ event: GracefulShutdownEvents.BEFORE_DESTROY })
  public async onBeforeDestroy(): Promise<void> {}

  @GracefulShutdownOnEvent({ event: GracefulShutdownEvents.AFTER_DESTROY, message: 'Test after destroy process' })
  public async onAfterDestroy(): Promise<void> {}

  @GracefulShutdownOnCount()
  public async onAsyncRun(ts: number): Promise<number> {
    await delay(ts);

    return ts;
  }

  @GracefulShutdownOnCount()
  public async onAsyncError(ts: number): Promise<number> {
    await promisesTimeout(ts, delay(ts + 100));

    return ts;
  }

  @GracefulShutdownOnCount()
  public onRun(ts: number): number {
    return ts;
  }

  @GracefulShutdownOnCount()
  public onError(): void {
    throw new Error();
  }
}

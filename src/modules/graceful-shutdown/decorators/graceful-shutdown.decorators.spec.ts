import { TestShutdownService } from 'tests/modules/graceful-shutdown';
import { GRACEFUL_SHUTDOWN_ON_COUNT_KEY, GRACEFUL_SHUTDOWN_ON_EVENT_KEY } from '../types/constants';

describe('Graceful Shutdown decorators', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('GracefulShutdownOnEvent', async () => {
    expect(
      Reflect.getMetadata(GRACEFUL_SHUTDOWN_ON_EVENT_KEY, TestShutdownService.prototype, 'onBeforeDestroy'),
    ).toEqual({
      event: 'beforeDestroy',
    });

    expect(
      Reflect.getMetadata(GRACEFUL_SHUTDOWN_ON_EVENT_KEY, TestShutdownService.prototype, 'onAfterDestroy'),
    ).toEqual({
      event: 'afterDestroy',
      message: 'Test after destroy process',
    });
  });

  it('GracefulShutdownOnCount', async () => {
    const options = Reflect.getMetadata(GRACEFUL_SHUTDOWN_ON_COUNT_KEY, TestShutdownService.prototype, 'onAsyncRun');

    expect(options).toEqual({});
  });
});

import { TimeoutError } from '../errors/timeout-error';
import { delay, promisesTimeout } from './utils';

describe('delay', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('default', async () => {
    const run = async (): Promise<string> => {
      await delay(10_000);

      return 'Hello word!';
    };

    jest.advanceTimersToNextTimerAsync(10_000);

    expect(await run()).toBe('Hello word!');
  });

  it('delay with callback', async () => {
    const spy = jest.fn();

    const run = async (): Promise<boolean> => {
      await delay(10_000, spy);

      return true;
    };

    jest.advanceTimersToNextTimerAsync(10_000);

    await run();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('promisesTimeout', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('success', async () => {
    const promise = new Promise((resolve) => resolve(true));

    jest.advanceTimersToNextTimerAsync(10_000);

    const result = await promisesTimeout(10_000, promise);

    expect(result).toBeTruthy();
  });

  it('TimeoutError', async () => {
    jest.advanceTimersToNextTimerAsync(10_000);
    let result: boolean;
    try {
      await promisesTimeout(5_000);
      result = true;
    } catch (e) {
      expect(e).toEqual(new TimeoutError(5_000));
    }
    expect(result).toBeUndefined();
  });

  it('TimeoutError for single task', async () => {
    jest.advanceTimersToNextTimerAsync(10_000);

    let result: boolean;
    try {
      const promise = delay(10_000);
      await promisesTimeout(5_000, promise);
      result = true;
    } catch (e) {
      expect(e).toEqual(new TimeoutError(5_000));
    }
    expect(result).toBeUndefined();
  });

  it('TimeoutError for many tasks', async () => {
    jest.advanceTimersToNextTimerAsync(10_000);

    let result: boolean;
    try {
      await promisesTimeout(5_000, delay(10_000), delay(12_000));
      result = true;
    } catch (e) {
      expect(e).toEqual(new TimeoutError(5_000));
    }
    expect(result).toBeUndefined();
  });
});

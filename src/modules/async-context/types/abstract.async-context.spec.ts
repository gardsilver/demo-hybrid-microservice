import { faker } from '@faker-js/faker';
import { AsyncLocalStorage } from 'node:async_hooks';
import { circularRemove, IGeneralAsyncContext } from 'src/modules/common';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { AbstractAsyncContext } from './abstract.async-context';
import { EmptyAsyncContextError } from './types';

interface ITestAsyncContext extends IGeneralAsyncContext {
  startTimestamp: number;
}

class TestAsyncContext extends AbstractAsyncContext<ITestAsyncContext> {
  public static instance = new TestAsyncContext();
}

describe(AbstractAsyncContext.name, () => {
  let asyncContext: ITestAsyncContext;
  let mockContext: ITestAsyncContext | undefined;

  beforeEach(async () => {
    asyncContext = generalAsyncContextFactory.build(TraceSpanBuilder.build() as unknown as ITestAsyncContext, {
      transient: { startTimestamp: faker.number.int() },
    }) as ITestAsyncContext;
    mockContext = {
      startTimestamp: faker.number.int(),
    } as ITestAsyncContext;
  });

  it('runWithContext', async () => {
    const run = (): void => {};
    const spyRun = jest.spyOn(AsyncLocalStorage.prototype, 'run');

    const context: ITestAsyncContext = {
      ...asyncContext,
      startTimestamp: faker.number.int(),
    };

    TestAsyncContext.instance.runWithContext(() => run(), context);

    expect(spyRun).toHaveBeenCalled();
  });

  it('runWithContextAsync', async () => {
    const run = async (): Promise<void> => {};
    const spyRun = jest.spyOn(AsyncLocalStorage.prototype, 'run');

    const context: ITestAsyncContext = {
      ...asyncContext,
      startTimestamp: faker.number.int(),
    };

    await TestAsyncContext.instance.runWithContextAsync(() => run(), context);

    expect(spyRun).toHaveBeenCalled();
  });

  it('get - success', async () => {
    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    const result = TestAsyncContext.instance.get('startTimestamp');

    expect(spyGetStore).toHaveBeenCalled();
    expect(mockContext).toBeDefined();
    expect(result).toEqual(mockContext?.startTimestamp);
  });

  it('get - failed', async () => {
    mockContext = undefined;

    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    let result;
    try {
      result = TestAsyncContext.instance.get('startTimestamp');
    } catch (e) {
      expect(e).toEqual(new EmptyAsyncContextError());
    }

    expect(spyGetStore).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('getSafe', async () => {
    mockContext = undefined;

    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    const result = TestAsyncContext.instance.getSafe('startTimestamp');

    expect(spyGetStore).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('extend', async () => {
    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    const result = TestAsyncContext.instance.extend();

    expect(spyGetStore).toHaveBeenCalled();
    expect(mockContext).toBeDefined();
    expect(result).toEqual(mockContext);
  });

  it('extend returns empty object on getStore throw', async () => {
    const spy = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockImplementation(() => {
      throw new Error('no store');
    });
    try {
      const result = TestAsyncContext.instance.extend();
      expect(result).toEqual({});
    } finally {
      spy.mockRestore();
    }
  });

  it('getSafe swallows getStore throw', async () => {
    const spy = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockImplementation(() => {
      throw new Error('no store');
    });
    try {
      const result = TestAsyncContext.instance.getSafe('startTimestamp');
      expect(result).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it('set', async () => {
    const copyContext = circularRemove(mockContext) as ITestAsyncContext;
    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    TestAsyncContext.instance.set('traceId', asyncContext.traceId);
    expect(spyGetStore).toHaveBeenCalled();
    expect(mockContext).toBeDefined();
    expect(mockContext).toEqual({
      ...copyContext,
      traceId: asyncContext.traceId,
    });
  });

  it('define - without initCallback runs with empty context', async () => {
    jest.restoreAllMocks();
    const spyRun = jest.spyOn(AsyncLocalStorage.prototype, 'run');

    class Subject {
      @AbstractAsyncContext.define()
      async run(): Promise<string> {
        return 'ok';
      }
    }

    const result = await new Subject().run();
    expect(result).toBe('ok');
    expect(spyRun).toHaveBeenCalledWith({}, expect.any(Function));
  });

  it('define - with initCallback invokes it with method args', async () => {
    jest.restoreAllMocks();
    const initCallback = jest.fn((value: number) => ({ startTimestamp: value }) as ITestAsyncContext);
    const spyRun = jest.spyOn(AsyncLocalStorage.prototype, 'run');

    class Subject {
      @AbstractAsyncContext.define<ITestAsyncContext>(initCallback)
      async run(_value: number): Promise<string> {
        return 'ok';
      }
    }

    const ts = faker.number.int();
    await new Subject().run(ts);
    expect(initCallback).toHaveBeenCalledWith(ts);
    expect(spyRun).toHaveBeenCalledWith({ startTimestamp: ts }, expect.any(Function));
  });

  it('setMultiple', async () => {
    const copyContext = circularRemove(mockContext) as ITestAsyncContext;
    const spyGetStore = jest.spyOn(AsyncLocalStorage.prototype, 'getStore').mockReturnValue(mockContext);

    TestAsyncContext.instance.setMultiple(asyncContext);
    expect(spyGetStore).toHaveBeenCalled();
    expect(mockContext).toBeDefined();
    expect(mockContext).toEqual({
      ...copyContext,
      ...asyncContext,
    });
  });
});

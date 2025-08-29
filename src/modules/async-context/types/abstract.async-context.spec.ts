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
  let mockContext: ITestAsyncContext;

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
    expect(result).toEqual(mockContext.startTimestamp);
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

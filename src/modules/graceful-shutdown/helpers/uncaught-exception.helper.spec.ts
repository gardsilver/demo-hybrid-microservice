import { DateTimestamp } from 'src/modules/date-timestamp';
import { UncaughtExceptionHelper } from './uncaught-exception.helper';

describe(UncaughtExceptionHelper.name, () => {
  const factoryError = (error: Error, asUncaughtException: boolean = true): Error => {
    if (asUncaughtException) {
      error.stack =
        'Error: Test uncaughtException!!!\n' +
        '    at TestService.throw (/app/src/test-module/services/test.service.ts:124:25)\n' +
        '    at Timeout._onTimeout (/app/src/test-module/services/test.service.ts:14:5)\n' +
        '    at listOnTimeout (node:internal/timers:569:17)\n' +
        '    at processTimers (node:internal/timers:512:7)\n';
    } else {
      error.stack =
        'Error: Test error!!!\n' +
        '    at /tmp/src/modules/common/helpers/uncaught-exception.helper.spec.ts:7:19\n' +
        '    at _despatchDescribe (/tmp/node_modules/jest-circus/build/index.js:91:26)\n' +
        '    at describe (/tmp/node_modules/jest-circus/build/index.js:55:5)\n' +
        '    at Object.<anonymous> (/tmp/src/modules/common/helpers/uncaught-exception.helper.spec.ts:3:1)\n' +
        '    at Runtime._execModule (/tmp/node_modules/jest-runtime/build/index.js:1439:24)\n' +
        '    at Runtime._loadModule (/tmp/node_modules/jest-runtime/build/index.js:1022:12)\n' +
        '    at jestAdapter (/tmp/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:77:13)\n' +
        '    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n' +
        '    at runTestInternal (/tmp/node_modules/jest-runner/build/runTest.js:367:16)\n' +
        '    at runTest (/tmp/node_modules/jest-runner/build/runTest.js:444:34)\n';
    }

    return error;
  };

  let error;

  beforeEach(async () => {
    error = new Error('Test error');

    factoryError(error);
  });

  describe('getUncaughtExceptionLabels', () => {
    it('отказ в строчке кода', () => {
      error = factoryError(error, false);
      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

      expect(labels).toEqual({
        type: 'Error',
        module: '',
        file: '/tmp/src/modules/common/helpers/uncaught-exception.helper.spec.ts',
      });
    });

    it('отказ в классе', () => {
      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

      expect(labels).toEqual({
        type: 'Error',
        module: 'TestService.throw',
        file: '/app/src/test-module/services/test.service.ts',
      });
    });

    it('отказ без stack', () => {
      error.stack = undefined;

      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

      expect(labels).toEqual({
        type: 'Error',
      });
    });

    it('отказ c не полным stack', () => {
      error.stack = 'Error: Test error!!!\n';

      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

      expect(labels).toEqual({
        type: 'Error',
      });
    });

    it('отказ c не корректным stack', () => {
      error.stack = 'Error: Test error!!!\n' + 'any line';

      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

      expect(labels).toEqual({
        type: 'Error',
      });
    });

    it('отказ когда объект ошибки является простым типом', () => {
      ['Uncaught Exception', 123144, BigInt('356745687546787'), Symbol('Symbol'), undefined].forEach((error) => {
        const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

        expect(labels).toEqual({
          type: typeof error,
        });
      });
    });

    it('отказ когда объект ошибки является function', () => {
      const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(factoryError);

      expect(labels).toEqual({
        type: 'factoryError',
      });
    });

    it('отказ когда объект ошибки является произвольным object', () => {
      [
        {
          details: 'Uncaught Exception',
        },
        [1, 2, 3],
        DateTimestamp,
        new DateTimestamp(),
      ].forEach((error, index) => {
        const labels = UncaughtExceptionHelper.getUncaughtExceptionLabels(error);

        expect(labels).toEqual({
          type:
            {
              0: 'Object',
              1: 'Array',
              2: 'DateTimestamp',
              3: 'DateTimestamp',
            }[index] ?? 'object',
        });
      });
    });
  });

  describe('getRejectionLabels', () => {
    it('отказ когда объект ошибки является string', () => {
      const labels = UncaughtExceptionHelper.getRejectionLabels('test');

      expect(labels).toEqual({
        reason: 'test',
      });
    });

    it('отказ когда объект ошибки является Error', () => {
      const labels = UncaughtExceptionHelper.getRejectionLabels(error);

      expect(labels).toEqual({
        reason: error.message,
        type: 'Error',
        module: 'TestService.throw',
        file: '/app/src/test-module/services/test.service.ts',
      });
    });

    it('отказ когда объект ошибки является другим типом', () => {
      const labels = UncaughtExceptionHelper.getRejectionLabels(null);

      expect(labels).toEqual({});
    });
  });
});

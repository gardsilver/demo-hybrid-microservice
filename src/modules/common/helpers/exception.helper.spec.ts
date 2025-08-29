import { ExceptionHelper } from './exception.helper';

describe(ExceptionHelper.name, () => {
  it('stackFormat', async () => {
    expect(ExceptionHelper.stackFormat(null)).toBeNull();
    expect(ExceptionHelper.stackFormat(undefined)).toBeUndefined();
    expect(ExceptionHelper.stackFormat({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(
      ExceptionHelper.stackFormat(
        'Error: Test uncaughtException!!!\n' +
          '    at TestService.throw (/app/src/test-module/services/test.service.ts:124:25)\n' +
          '    at Timeout._onTimeout (/app/src/test-module/services/test.service.ts:14:5)\n' +
          '    at listOnTimeout (node:internal/timers:569:17)\n' +
          '    at processTimers (node:internal/timers:512:7)\n',
      ),
    ).toEqual([
      'Error: Test uncaughtException!!!',
      'at TestService.throw (/app/src/test-module/services/test.service.ts:124:25)',
      'at Timeout._onTimeout (/app/src/test-module/services/test.service.ts:14:5)',
      'at listOnTimeout (node:internal/timers:569:17)',
      'at processTimers (node:internal/timers:512:7)',
    ]);
  });
});

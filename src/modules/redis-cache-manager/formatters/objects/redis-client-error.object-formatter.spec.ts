import { ReconnectStrategyError, MultiErrorReply, ErrorReply } from '@redis/client';
import { RedisClientErrorFormatter } from './redis-client-error.object-formatter';

describe(RedisClientErrorFormatter.name, () => {
  let originalError: Error;
  let socketError: unknown;
  let error: ReconnectStrategyError | MultiErrorReply;
  let formatter: RedisClientErrorFormatter;

  beforeEach(async () => {
    originalError = new Error();
    originalError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    socketError = {
      status: 'error',
    };

    error = new ReconnectStrategyError(originalError, socketError);
    error.stack = 'Error: message\n    at <anonymous>:1:2\n';

    formatter = new RedisClientErrorFormatter();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(error)).toBeTruthy();
    expect(formatter.canFormat(new MultiErrorReply([], []))).toBeTruthy();
  });

  it('transform ReconnectStrategyError', async () => {
    expect(formatter.transform(error)).toEqual({
      originalError: {
        type: 'Error',
        message: '',
        stack: ['Error: message', 'at <anonymous>:1:2'],
      },
      socketError,
    });

    originalError['errors'] = [socketError];

    expect(formatter.transform(error)).toEqual({
      originalError: {
        type: 'Error',
        message: '',
        errors: [socketError],
        stack: ['Error: message', 'at <anonymous>:1:2'],
      },
      socketError,
    });

    originalError['errors'] = socketError;

    expect(formatter.transform(error)).toEqual({
      originalError: {
        type: 'Error',
        message: '',
        errors: socketError,
        stack: ['Error: message', 'at <anonymous>:1:2'],
      },
      socketError,
    });
  });

  it('transform MultiErrorReply', async () => {
    const errorReply = new ErrorReply();
    errorReply.stack = undefined;

    error = new MultiErrorReply([], []);
    error.stack = 'Error: message\n    at <anonymous>:1:2\n';

    expect(formatter.transform(error)).toEqual({
      replies: [],
      errorIndexes: [],
    });

    error = new MultiErrorReply([errorReply], []);
    error.stack = 'Error: message\n    at <anonymous>:1:2\n';

    expect(formatter.transform(error)).toEqual({
      replies: [
        {
          type: 'Error',
          message: '',
        },
      ],
      errorIndexes: [],
    });
  });
});

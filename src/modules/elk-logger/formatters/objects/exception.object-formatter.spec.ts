import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { ExceptionObjectFormatter } from './exception.object-formatter';

describe(ExceptionObjectFormatter.name, () => {
  let formatter: ExceptionObjectFormatter;

  beforeEach(async () => {
    formatter = new ExceptionObjectFormatter([]);

    jest.clearAllMocks();
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeTruthy();
  });

  it('setObjectFormatters', async () => {
    expect(formatter['objectFormatters']).toBeUndefined();
    formatter.setObjectFormatters([]);
    expect(formatter['objectFormatters']).toEqual([]);
  });

  describe('transform', () => {
    beforeEach(async () => {
      formatter = new ExceptionObjectFormatter([new MockObjectFormatter('error')]);
      formatter.setObjectFormatters([new MockObjectFormatter('object')]);
    });

    it('cause as  Error', async () => {
      const parentError = Error('Parent Error');
      parentError.stack = undefined;

      const error = Error('Custom Error', { cause: parentError });
      error.stack = 'Error: message\n    at <anonymous>:1:2\n';

      expect(formatter.transform(error)).toEqual({
        type: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        cause: {
          type: 'Error',
          message: 'Parent Error',
          field: 'error',
        },
      });
    });

    it('cause as any', async () => {
      const parentError = { status: 'ok' };

      const error = Error('Custom Error', { cause: parentError });
      error.stack = 'Error: message\n    at <anonymous>:1:2\n';

      expect(formatter.transform(error)).toEqual({
        type: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        cause: {
          field: 'object',
        },
      });

      const cause = Error('Parent Error');
      cause.stack = undefined;
      error['errors'] = [cause];

      expect(formatter.transform(error)).toEqual({
        type: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        errors: [
          {
            type: 'Error',
            message: 'Parent Error',
            field: 'error',
          },
        ],
        cause: {
          field: 'object',
        },
      });

      error['errors'] = cause;

      expect(formatter.transform(error)).toEqual({
        type: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        errors: {
          type: 'Error',
          message: 'Parent Error',
          field: 'error',
        },
        cause: {
          field: 'object',
        },
      });
    });
  });
});

import { MockErrorFormatter, MockUnknownFormatter } from 'tests/modules/elk-logger';
import { ErrorObjectFormatter } from './error.object-formatter';
import { IUnknownFormatter } from '../../types/elk-logger.types';

describe(ErrorObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: ErrorObjectFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new ErrorObjectFormatter([]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeTruthy();
  });

  it('setUnknownFormatter', async () => {
    expect(formatter['unknownFormatter']).toBeUndefined();
    formatter.setUnknownFormatter(unknownFormatter);
    expect(formatter['unknownFormatter']).toEqual(unknownFormatter);
  });

  describe('transform', () => {
    const spySetUnknownFormatter = jest.spyOn(MockErrorFormatter.prototype, 'setUnknownFormatter');

    beforeEach(async () => {
      formatter = new ErrorObjectFormatter([new MockErrorFormatter('error')]);
      formatter.setUnknownFormatter(unknownFormatter);

      jest.spyOn(unknownFormatter, 'transform').mockImplementation((value) => {
        if (!value) {
          return undefined;
        }

        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
          };
        }

        return { field: 'field' };
      });
    });

    it('call setUnknownFormatter for ErrorFormatters', async () => {
      expect(spySetUnknownFormatter).toHaveBeenCalledWith(unknownFormatter);
    });

    it('default', async () => {
      formatter = new ErrorObjectFormatter([]);
      formatter.setUnknownFormatter(unknownFormatter);

      const parentError = Error('Parent Error');
      parentError.stack = undefined;

      const error = Error('Custom Error', { cause: parentError });
      error.stack = 'Error: message\n    at <anonymous>:1:2\n';

      expect(formatter.transform(error)).toEqual({
        name: 'Error',
        message: 'Custom Error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        cause: {
          message: 'Parent Error',
          name: 'Error',
        },
      });
    });

    it('cause as Error', async () => {
      const parentError = Error('Parent Error');
      parentError.stack = undefined;

      const error = Error('Custom Error', { cause: parentError });
      error.stack = 'Error: message\n    at <anonymous>:1:2\n';

      expect(formatter.transform(error)).toEqual({
        name: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        cause: {
          message: 'Parent Error',
          name: 'Error',
        },
      });
    });

    it('cause as any', async () => {
      const parentError = { status: 'error' };

      const error = Error('Custom Error', { cause: parentError });
      error.stack = 'Error: message\n    at <anonymous>:1:2\n';
      (error as unknown as Record<string, unknown>).name = undefined;

      expect(formatter.transform(error)).toEqual({
        name: 'Error',
        message: 'Custom Error',
        field: 'error',
        stack: ['Error: message', 'at <anonymous>:1:2'],
        cause: { field: 'field' },
      });
    });

    it('without cause', async () => {
      const error = Error('Custom Error');
      error.stack = undefined;
      error.name = 'CustomError';

      expect(formatter.transform(error)).toEqual({
        name: 'CustomError',
        message: 'Custom Error',
        field: 'error',
      });
    });
  });
});

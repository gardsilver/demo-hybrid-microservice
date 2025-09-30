import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { IUnknownFormatter } from '../../types/elk-logger.types';
import { AggregateErrorObjectFormatter } from './aggregate-error.object-formatter';

describe(AggregateErrorObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: AggregateErrorObjectFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new AggregateErrorObjectFormatter();
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf({ status: 'ok' })).toBeFalsy();
    expect(formatter.isInstanceOf('success')).toBeFalsy();
    expect(formatter.isInstanceOf(12345)).toBeFalsy();
    expect(formatter.isInstanceOf(true)).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(new AggregateError([]))).toBeTruthy();
  });

  it('transform', async () => {
    formatter.setUnknownFormatter(unknownFormatter);
    expect(formatter.transform(new AggregateError([]))).toEqual({
      errors: {
        field: 'fieldName',
      },
    });
  });
});

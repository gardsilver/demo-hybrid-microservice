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

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat({ status: 'ok' })).toBeFalsy();
    expect(formatter.canFormat('success')).toBeFalsy();
    expect(formatter.canFormat(12345)).toBeFalsy();
    expect(formatter.canFormat(true)).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(new AggregateError([]))).toBeTruthy();
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

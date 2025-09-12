import { MockUnknownFormatter } from './mock.unknown-formatter';

describe(MockUnknownFormatter.name, () => {
  let formatter: MockUnknownFormatter;

  it('default', async () => {
    formatter = new MockUnknownFormatter();

    expect(formatter['fieldName']).toBe('fieldName');
  });

  it('transform', async () => {
    formatter = new MockUnknownFormatter('field');

    expect(formatter.transform()).toEqual({
      field: 'field',
    });
  });
});

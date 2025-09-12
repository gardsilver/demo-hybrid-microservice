import { MockErrorFormatter } from './mock.error-formatter';

describe(MockErrorFormatter.name, () => {
  let formatter: MockErrorFormatter;

  it('default', async () => {
    formatter = new MockErrorFormatter();

    expect(formatter['fieldName']).toBe('fieldName');
    expect(formatter.canFormat(undefined)).toBeTruthy();
  });

  it('transform', async () => {
    formatter = new MockErrorFormatter('field');

    expect(formatter.transform()).toEqual({
      field: 'field',
    });
  });
});

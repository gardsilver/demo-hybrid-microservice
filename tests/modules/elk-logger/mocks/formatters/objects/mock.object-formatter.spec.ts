import { MockObjectFormatter } from './mock.object-formatter';

describe(MockObjectFormatter.name, () => {
  let formatter: MockObjectFormatter;

  it('default', async () => {
    formatter = new MockObjectFormatter();

    expect(formatter['fieldName']).toBe('fieldName');
    expect(formatter.canFormat(undefined)).toBeTruthy();
  });

  it('transform', async () => {
    formatter = new MockObjectFormatter('field');

    expect(formatter.transform()).toEqual({
      field: 'field',
    });
  });
});

import { DatabaseError, Model, ValidationErrorItem, ValidationErrorItemType } from 'sequelize';
import { ValidationErrorItemObjectFormatter } from './validation-error-item.object-formatter';
import { DatabaseHelper } from '../../helpers/database.helper';

describe(ValidationErrorItemObjectFormatter.name, () => {
  let formatter: ValidationErrorItemObjectFormatter;

  beforeEach(async () => {
    formatter = new ValidationErrorItemObjectFormatter();

    jest.clearAllMocks();
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(new DatabaseError({ sql: '', name: '', message: '' }))).toBeFalsy();
    expect(
      formatter.canFormat(
        new ValidationErrorItem(
          'message',
          ValidationErrorItemType['validation error'],
          'path',
          'value',
          { name: 'First name' } as undefined as Model,
          'validatorKey',
          'fnName',
          ['Second Name'],
        ),
      ),
    ).toBeTruthy();
  });

  it('transform ValidationErrorItem', async () => {
    jest.spyOn(DatabaseHelper, 'modelToLogFormat').mockImplementation(() => ({ status: 'ok' }));

    const errorItem = new ValidationErrorItem(
      'message',
      ValidationErrorItemType['validation error'],
      'path',
      'value',
      { name: 'First name' } as undefined as Model,
      'validatorKey',
      'fnName',
      ['Second Name'],
    );

    expect(formatter.transform(errorItem)).toEqual({
      type: null,
      origin: 'FUNCTION',
      path: 'path',
      value: 'value',
      validatorKey: 'validatorKey',
      validatorName: 'fnName',
      instance: { status: 'ok' },
    });
  });
});

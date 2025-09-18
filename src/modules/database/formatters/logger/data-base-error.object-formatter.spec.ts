import {
  BaseError,
  AggregateError,
  BulkRecordError,
  DatabaseError,
  OptimisticLockError,
  ValidationErrorItem,
  Model,
  ValidationErrorItemType,
} from 'sequelize';
import { IUnknownFormatter } from 'src/modules/elk-logger';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { DataBaseErrorFormatter } from './data-base-error.object-formatter';
import { DatabaseHelper } from '../../helpers/database.helper';

class CustomBaseError extends BaseError {}

describe(DataBaseErrorFormatter.name, () => {
  let cause: Error;
  let dataBaseError: BaseError;
  let unknownFormatter: IUnknownFormatter;
  let formatter: DataBaseErrorFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new DataBaseErrorFormatter();
    formatter.setUnknownFormatter(unknownFormatter);

    cause = new Error('Cause Error');
    cause.stack = undefined;

    dataBaseError = new DatabaseError({ sql: '', name: '', message: '' });
    dataBaseError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    jest.clearAllMocks();
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(dataBaseError)).toBeTruthy();
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

  it('transform AggregateError', async () => {
    const aggregateError = new AggregateError([dataBaseError]);

    expect(formatter.transform(aggregateError)).toEqual({
      errors: [
        {
          field: 'fieldName',
        },
      ],
    });
  });

  it('transform BulkRecordError', async () => {
    jest.spyOn(DatabaseHelper, 'modelToLogFormat').mockImplementation(() => ({ status: 'ok' }));

    const error = new Error('Any Error');
    error.stack = undefined;
    error.cause = dataBaseError;

    const bulkRecordError = new BulkRecordError(dataBaseError, { name: 'First name' } as undefined as Model);
    bulkRecordError.stack = undefined;

    expect(formatter.transform(bulkRecordError)).toEqual({
      errors: [
        {
          field: 'fieldName',
        },
      ],
      record: { status: 'ok' },
    });
  });

  it('transform DatabaseError', async () => {
    expect(formatter.transform(dataBaseError)).toEqual({
      sql: '',
      parameters: {},
    });
  });

  it('transform OptimisticLockError', async () => {
    const error = new Error('Any Error');
    error.stack = undefined;
    error.cause = dataBaseError;

    const bulkRecordError = new OptimisticLockError({
      message: 'message',
      modelName: 'UserModel',
      values: { id: 12 },
      where: { name: 'First name' },
    });
    bulkRecordError.stack = undefined;

    expect(formatter.transform(bulkRecordError)).toEqual({
      modelName: 'UserModel',
      values: { id: 12 },
      where: { name: 'First name' },
    });
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

  it('CustomBaseError', async () => {
    const error = new CustomBaseError('message');

    expect(formatter.transform(error)).toEqual({});
  });
});

import {
  BaseError,
  AggregateError,
  BulkRecordError,
  DatabaseError,
  OptimisticLockError,
  ValidationError,
  ValidationErrorItem,
} from 'sequelize';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';
import { DatabaseHelper } from '../../helpers/database.helper';

export class DataBaseErrorFormatter extends BaseErrorObjectFormatter<BaseError | ValidationErrorItem> {
  canFormat(obj: unknown): obj is BaseError | ValidationErrorItem {
    return obj instanceof BaseError || obj instanceof ValidationErrorItem;
  }

  transform(from: BaseError | ValidationErrorItem): IKeyValue<unknown> {
    if (from instanceof AggregateError || from instanceof ValidationError) {
      return {
        errors: from.errors?.map((error) => this.unknownFormatter.transform(error)),
      };
    }

    if (from instanceof BulkRecordError) {
      return {
        errors: [this.unknownFormatter.transform(from.errors)],
        record: DatabaseHelper.modelToLogFormat(from.record),
      };
    }

    if (from instanceof DatabaseError) {
      return {
        sql: from.sql,
        parameters: from.parameters,
      };
    }

    if (from instanceof OptimisticLockError) {
      return {
        modelName: from.modelName,
        values: from.values,
        where: from.where,
      };
    }

    if (from instanceof ValidationErrorItem) {
      return {
        type: from.type,
        origin: from.origin,
        path: from.path,
        value: from.value,
        validatorKey: from.validatorKey,
        validatorName: from.validatorName,
        instance: DatabaseHelper.modelToLogFormat(from.instance),
      };
    }

    return {};
  }
}

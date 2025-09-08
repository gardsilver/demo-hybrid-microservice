import {
  BaseError,
  AggregateError,
  BulkRecordError,
  DatabaseError,
  OptimisticLockError,
  ValidationError,
  ValidationErrorItem,
} from 'sequelize';
import { ExceptionHelper, IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';
import { DatabaseHelper } from '../../helpers/database.helper';

export class DataBaseErrorFormatter implements IObjectFormatter<BaseError | ValidationErrorItem> {
  canFormat(obj: unknown): obj is BaseError | ValidationErrorItem {
    return obj instanceof BaseError || obj instanceof ValidationErrorItem;
  }

  transform(from: BaseError | ValidationErrorItem): IKeyValue<unknown> {
    if (from instanceof AggregateError || from instanceof ValidationError) {
      return {
        errors: from.errors?.map((error) => this.formatBase(error)),
      };
    }

    if (from instanceof BulkRecordError) {
      return {
        errors: [this.formatBase(from.errors)],
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

  private formatBase(from: unknown | Error): unknown | IKeyValue<unknown> {
    if (from && from instanceof Error) {
      const fields = this.canFormat(from) ? this.transform(from) : {};

      return {
        type: from.name ?? from.constructor.name,
        message: from.message,
        ...fields,
        stack: ExceptionHelper.stackFormat(from.stack),
        errors:
          'errors' in from
            ? Array.isArray(from['errors'])
              ? from['errors'].map((err) => this.formatBase(err))
              : this.formatBase(from['errors'])
            : undefined,
        cause: from.cause ? this.formatBase(from.cause) : undefined,
      };
    }

    return from;
  }
}

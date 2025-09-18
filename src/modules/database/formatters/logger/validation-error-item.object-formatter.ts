import { ValidationErrorItem } from 'sequelize';
import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';
import { DatabaseHelper } from '../../helpers/database.helper';

/**
 * @deprecated
 * @TODO в sequelize v7 ValidationErrorItem является объектом Error (@see DataBaseErrorFormatter)
 */
export class ValidationErrorItemObjectFormatter implements IObjectFormatter<ValidationErrorItem> {
  canFormat(obj: unknown): obj is ValidationErrorItem {
    return obj instanceof ValidationErrorItem;
  }

  transform(from: ValidationErrorItem): IKeyValue<unknown> {
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
}
